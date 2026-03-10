import { useState, useRef } from "react";
import {
  Box, Flex, Heading, Button, Select, Text, Alert, AlertIcon,
  AlertDescription, useColorModeValue, Input, IconButton,
  HStack, Progress, VStack, Badge, Divider,
} from "@chakra-ui/react";
import {
  MdUploadFile, MdDownload, MdArrowBack, MdDeleteSweep,
  MdCheckCircle, MdCloudUpload,
} from "react-icons/md";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";

export default function BulkUploadTask() {
  const navigate = useNavigate();
  const { selectedProject, projects } = useAuth();

  const [selectedProjectId, setSelectedProjectId] = useState(selectedProject?._id || "");

  // File metadata — rows stored in ref, never state
  const [fileName, setFileName]         = useState("");
  const [fileReady, setFileReady]       = useState(false);
  const [parseError, setParseError]     = useState("");
  const [rowCount, setRowCount]         = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);

  // Upload state
  const [uploading, setUploading]       = useState(false);
  const [totalCreated, setTotalCreated] = useState(0);
  const [totalFailed, setTotalFailed]   = useState(0);
  const [done, setDone]                 = useState(false);
  const [progress, setProgress]         = useState(0);

  // Delete all
  const [deletingAll, setDeletingAll]   = useState(false);
  const [deleteAllMsg, setDeleteAllMsg] = useState("");

  const parsedRef    = useRef([]);
  const fileInputRef = useRef(null);
  const timerRef     = useRef(null);

  // ── Colors ────────────────────────────────────────────────────────────────
  const cardBg      = useColorModeValue("white", "gray.800");
  const textColor   = useColorModeValue("gray.800", "white");
  const subColor    = useColorModeValue("gray.500", "gray.400");
  const borderColor = useColorModeValue("#e5e7eb", "#4a5568");
  const uploadBoxBg = useColorModeValue("gray.50", "gray.750");
  const uploadBdr   = useColorModeValue("#93c5fd", "#4a5568");
  const infoBg      = useColorModeValue("blue.50", "blue.900");
  const infoBdr     = useColorModeValue("#bee3f8", "#2a4365");
  const infoClr     = useColorModeValue("blue.700", "blue.200");

  // ── Reset ─────────────────────────────────────────────────────────────────
  const reset = () => {
    clearInterval(timerRef.current);
    setFileName(""); setFileReady(false); setParseError("");
    setRowCount(0); setSkippedCount(0);
    setUploading(false); setTotalCreated(0); setTotalFailed(0);
    setDone(false); setProgress(0);
    parsedRef.current = [];
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Parse xlsx ────────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    reset();
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb  = XLSX.read(evt.target.result, { type: "binary" });
        const ws  = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { defval: "" });

        let valid = 0, skipped = 0;
        const rows = [];

        for (const row of raw) {
          const norm = {};
          Object.keys(row).forEach(k => { norm[k.trim().toLowerCase()] = row[k]; });

          const name   = String(norm["name"] || norm["title"] || norm["task name"] || "").trim();
          const desc   = String(norm["description"] || norm["desc"] || "").trim();
          const assign = String(norm["assignee"] || norm["assigned to"] || norm["staff"] || "").trim();
          const status = String(norm["status"] || norm["task status"] || "").trim();

          if (!name || !assign) { skipped++; continue; }

          rows.push({ name, description: desc, assigneeName: assign, statusName: status });
          valid++;
        }

        if (valid === 0) {
          setParseError("No valid rows found. Make sure the file has 'name' and 'assignee' columns.");
          return;
        }

        parsedRef.current = rows;
        setRowCount(valid);
        setSkippedCount(skipped);
        setFileReady(true);
      } catch {
        setParseError("Failed to parse file. Make sure it's a valid .xlsx or .xls file.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  // ── Delete all ────────────────────────────────────────────────────────────
  const handleDeleteAll = async () => {
    if (!window.confirm("Delete ALL tasks? This cannot be undone.")) return;
    setDeletingAll(true); setDeleteAllMsg("");
    try {
      const res = await api.delete("/tasks/all");
      setDeleteAllMsg("deleted:" + res.data.deleted);
    } catch {
      setDeleteAllMsg("error");
    } finally { setDeletingAll(false); }
  };

  // ── Upload — ONE API call, animated progress ─────────────────────────────
  // Single POST with ALL rows. MongoDB insertMany handles 200k rows in ~1-2s.
  // Progress animates 0→95 while waiting, snaps to 100 on response.
  const handleUpload = async () => {
    const rows = parsedRef.current;
    if (!rows.length) return;

    clearInterval(timerRef.current);
    setUploading(true);
    setDone(false);
    setProgress(0);
    setTotalCreated(0);
    setTotalFailed(0);

    // Animate 0 → 95 in ~2s (66 steps × 30ms = ~2s)
    let animPct = 0;
    timerRef.current = setInterval(() => {
      animPct = Math.min(animPct + 1.43, 95);
      setProgress(+animPct.toFixed(1));
      if (animPct >= 95) clearInterval(timerRef.current);
    }, 30);

    try {
      const res = await api.post("/tasks/bulk", {
        tasks:   rows,
        project: selectedProjectId || null,
      });
      clearInterval(timerRef.current);
      setProgress(100);
      setTotalCreated(res.data.created || 0);
      setTotalFailed(res.data.failed   || 0);
    } catch {
      clearInterval(timerRef.current);
      setProgress(100);
      setTotalFailed(rows.length);
    }

    setUploading(false);
    setDone(true);
  };

  // ── Sample download ───────────────────────────────────────────────────────
  const downloadSample = () => {
    const sample = [
      { name: "Design landing page",  description: "Create wireframes",       assignee: "John Doe",   status: "Pending"     },
      { name: "Fix login bug",        description: "Token not refreshing",    assignee: "Jane Smith", status: "In Progress" },
      { name: "Write API docs",       description: "Document all endpoints",  assignee: "John Doe",   status: "Pending"     },
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tasks");
    XLSX.writeFile(wb, "bulk_tasks_sample.xlsx");
  };

  return (
    <Box maxW="560px" mx="auto">
      <Box bg={cardBg} borderRadius="xl" boxShadow="md" overflow="hidden">

        {/* ── Header ───────────────────────────────────────────────────── */}
        <Box px={6} py={4} borderBottom={`1px solid ${borderColor}`}>
          <Flex justify="space-between" align="center">
            <HStack spacing={3}>
              <IconButton icon={<MdArrowBack size={18} />} size="sm" variant="ghost"
                aria-label="Back" onClick={() => navigate("/admin/tasks")} />
              <Box>
                <Heading size="md" color={textColor}>Bulk Upload Tasks</Heading>
                <Text fontSize="xs" color={subColor} mt={0.5}>
                  Upload thousands of tasks instantly
                </Text>
              </Box>
            </HStack>
            <HStack spacing={2}>
              <Button size="sm" leftIcon={<MdDownload size={14} />} variant="outline"
                colorScheme="blue" onClick={downloadSample} isDisabled={uploading}>
                Sample
              </Button>
              <Button size="sm" leftIcon={<MdDeleteSweep size={16} />} colorScheme="red"
                variant="outline" onClick={handleDeleteAll} isLoading={deletingAll}
                loadingText="Deleting…" isDisabled={uploading}>
                Delete All
              </Button>
            </HStack>
          </Flex>
        </Box>

        <Box px={6} py={5}>
          <VStack spacing={5} align="stretch">

            {/* Delete All result */}
            {deleteAllMsg && (
              <Alert status={deleteAllMsg.startsWith("deleted") ? "info" : "error"} borderRadius="lg">
                <AlertIcon />
                <AlertDescription fontSize="sm">
                  {deleteAllMsg.startsWith("deleted")
                    ? `Deleted ${deleteAllMsg.split(":")[1]} task(s) successfully.`
                    : "Failed to delete tasks. Please try again."}
                </AlertDescription>
              </Alert>
            )}

            {/* Step 1 — Project */}
            <Box>
              <Flex align="center" gap={2} mb={2}>
                <Box w={5} h={5} borderRadius="full" bg="blue.500" color="white"
                  display="flex" alignItems="center" justifyContent="center"
                  fontSize="10px" fontWeight="700">1</Box>
                <Text fontSize="sm" fontWeight="600" color={textColor}>Select Project (optional)</Text>
              </Flex>
              <Select placeholder="No project" value={selectedProjectId}
                onChange={e => setSelectedProjectId(e.target.value)} isDisabled={uploading}>
                {(projects || []).map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </Select>
            </Box>

            <Divider />

            {/* Step 2 — File */}
            <Box>
              <Flex align="center" gap={2} mb={2}>
                <Box w={5} h={5} borderRadius="full" bg="blue.500" color="white"
                  display="flex" alignItems="center" justifyContent="center"
                  fontSize="10px" fontWeight="700">2</Box>
                <Text fontSize="sm" fontWeight="600" color={textColor}>Choose Excel File</Text>
              </Flex>

              {!uploading && !done && (
                <Box p={8} borderRadius="xl" border={`2px dashed ${uploadBdr}`}
                  bg={uploadBoxBg} cursor="pointer" textAlign="center"
                  onClick={() => fileInputRef.current?.click()}
                  _hover={{ borderColor: "blue.400", bg: "blue.50" }} transition="all 0.2s"
                  _dark={{ _hover: { bg: "gray.700" } }}>
                  <MdCloudUpload size={40} color="#63b3ed" style={{ margin: "0 auto 8px" }} />
                  <Text fontWeight="600" color={textColor} fontSize="sm" mb={1}>
                    {fileName ? `📄 ${fileName}` : "Click to browse .xlsx / .xls"}
                  </Text>
                  <Text fontSize="xs" color={subColor} mb={2}>
                    Required: <b>name</b>, <b>assignee</b> &nbsp;·&nbsp; Optional: description, status
                  </Text>
                  <Box display="inline-block" px={3} py={1} bg={infoBg}
                    border={`1px solid ${infoBdr}`} borderRadius="full">
                    <Text fontSize="xs" color={infoClr} fontWeight="600">
                      ⚡ Auto-batched upload — no size limits
                    </Text>
                  </Box>
                  <Input ref={fileInputRef} type="file" accept=".xlsx,.xls"
                    display="none" onChange={handleFileChange} />
                </Box>
              )}
            </Box>

            {/* Parse error */}
            {parseError && (
              <Alert status="error" borderRadius="lg">
                <AlertIcon /><AlertDescription fontSize="sm">{parseError}</AlertDescription>
              </Alert>
            )}

            {/* File ready — show counts + upload button */}
            {fileReady && !uploading && !done && (
              <Box p={4} borderRadius="xl" border={`1px solid ${borderColor}`} bg={uploadBoxBg}>
                <Flex justify="space-between" align="flex-start">
                  <VStack align="flex-start" spacing={1}>
                    <HStack>
                      <Badge colorScheme="green" borderRadius="full" px={3} py={1} fontSize="xs">
                        ✅ {rowCount.toLocaleString()} rows ready
                      </Badge>
                      {skippedCount > 0 && (
                        <Badge colorScheme="orange" borderRadius="full" px={3} py={1} fontSize="xs">
                          ⚠ {skippedCount} skipped
                        </Badge>
                      )}
                    </HStack>
                    <Text fontSize="xs" color={subColor}>
                      Auto-batched · fast bulk insert
                    </Text>
                    {skippedCount > 0 && (
                      <Text fontSize="xs" color={subColor}>Skipped rows missing name or assignee.</Text>
                    )}
                  </VStack>
                  <Button colorScheme="blue" size="sm" leftIcon={<MdUploadFile size={14} />}
                    onClick={handleUpload}>
                    Upload
                  </Button>
                </Flex>
              </Box>
            )}

            {/* ── Progress bar ─────────────────────────────────────────── */}
            {uploading && (
              <Box p={5} borderRadius="xl" border={`1px solid ${borderColor}`} bg={uploadBoxBg}>
                <Flex justify="space-between" align="center" mb={3}>
                  <VStack align="flex-start" spacing={0}>
                    <Text fontSize="sm" fontWeight="700" color={textColor}>
                      Uploading {rowCount.toLocaleString()} tasks…
                    </Text>
                    <Text fontSize="xs" color={subColor}>Uploading in fast batches…</Text>
                  </VStack>
                  <Text fontSize="xl" fontWeight="800" color="blue.500">
                    {Math.round(progress)}%
                  </Text>
                </Flex>
                <Progress
                  value={progress}
                  size="md"
                  colorScheme="blue"
                  borderRadius="full"
                  hasStripe
                  isAnimated
                  sx={{ "& > div": { transition: "width 0.05s linear" } }}
                />
                <Text fontSize="xs" color={subColor} mt={2} textAlign="center">
                  ⚡ Auto-batched to avoid payload limits
                </Text>
              </Box>
            )}

            {/* Done */}
            {done && (
              <>
                <Alert status={totalFailed > 0 && totalCreated === 0 ? "error" : totalFailed > 0 ? "warning" : "success"}
                  borderRadius="xl">
                  <AlertIcon as={totalFailed === 0 ? MdCheckCircle : undefined} />
                  <Box>
                    <Text fontSize="sm" fontWeight="700">
                      {totalFailed > 0
                        ? `${totalCreated.toLocaleString()} created, ${totalFailed.toLocaleString()} failed (duplicates or unmatched assignees)`
                        : `✅ ${totalCreated.toLocaleString()} task${totalCreated !== 1 ? "s" : ""} created successfully!`}
                    </Text>
                    {totalFailed === 0 && (
                      <Text fontSize="xs" color={subColor} mt={1}>Redirecting to tasks…</Text>
                    )}
                  </Box>
                </Alert>

                {done && totalFailed === 0 && (
                  setTimeout(() => navigate("/admin/tasks"), 1800) && null
                )}

                <Flex justify="flex-end" gap={2}>
                  <Button size="sm" variant="outline" onClick={reset}>Upload Another</Button>
                  <Button size="sm" colorScheme="blue" onClick={() => navigate("/admin/tasks")}>
                    Go to Tasks
                  </Button>
                </Flex>
              </>
            )}

          </VStack>
        </Box>
      </Box>
    </Box>
  );
}