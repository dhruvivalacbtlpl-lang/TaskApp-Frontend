import { useEffect, useState, useRef } from "react";
import {
  Box, Flex, Heading, Button, Select, Text, Alert, AlertIcon,
  AlertDescription, useColorModeValue, Input, IconButton,
  HStack, Progress, VStack, Badge,
} from "@chakra-ui/react";
import { MdUploadFile, MdDownload, MdArrowBack, MdClose, MdCheckCircle, MdDeleteSweep } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";

const BATCH_SIZE = 100;

export default function BulkUploadTask() {
  const navigate = useNavigate();
  const { selectedProject, projects } = useAuth();

  const [selectedProjectId, setSelectedProjectId] = useState(selectedProject?._id || "");
  // File state — only metadata, never store parsed rows in state (causes crash)
  const [fileName, setFileName]       = useState("");
  const [fileReady, setFileReady]     = useState(false);
  const [parseError, setParseError]   = useState("");
  const [rowCount, setRowCount]       = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);

  // Upload progress
  const [uploading, setUploading]       = useState(false);
  const [totalCreated, setTotalCreated] = useState(0);
  const [totalFailed, setTotalFailed]   = useState(0);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [done, setDone]                 = useState(false);
  const [deletingAll, setDeletingAll]   = useState(false);
  const [deleteAllMsg, setDeleteAllMsg] = useState("");

  const cancelRef   = useRef(false);
  const parsedRef   = useRef([]);
  const fileInputRef = useRef(null);

  const cardBg      = useColorModeValue("white", "gray.800");
  const textColor   = useColorModeValue("gray.800", "white");
  const subColor    = useColorModeValue("gray.500", "gray.400");
  const borderColor = useColorModeValue("#e5e7eb", "#4a5568");
  const uploadBoxBg = useColorModeValue("gray.50", "gray.700");
  const uploadBorder= useColorModeValue("#bee3f8", "#4a5568");

  useEffect(() => {
    // Staff/status resolved on backend — no need to fetch here
  }, []);

  const reset = () => {
    setFileName(""); setFileReady(false); setParseError("");
    setRowCount(0); setSkippedCount(0);
    setUploading(false); setTotalCreated(0); setTotalFailed(0);
    setCurrentBatch(0); setTotalBatches(0); setDone(false);
    cancelRef.current  = false;
    parsedRef.current  = [];
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Parse file — store rows in ref, only counts in state ─────────────────
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    reset();
    setFileName(file.name);
    setParseError("");

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb   = XLSX.read(evt.target.result, { type: "binary" });
        const ws   = wb.Sheets[wb.SheetNames[0]];

        // sheet_to_json with header:1 returns raw arrays — faster than object mode for large files
        const raw = XLSX.utils.sheet_to_json(ws, { defval: "" });

        let valid   = 0;
        let skipped = 0;
        const rows  = [];

        for (const row of raw) {
          const norm = {};
          Object.keys(row).forEach(k => { norm[k.trim().toLowerCase()] = row[k]; });

          const name   = String(norm["name"] || norm["title"] || norm["task name"] || "").trim();
          const desc   = String(norm["description"] || norm["desc"] || "").trim();
          const assign = String(norm["assignee"] || norm["assigned to"] || norm["staff"] || "").trim();
          const status = String(norm["status"] || norm["task status"] || "").trim();

          if (!name) { skipped++; continue; }

          if (!assign) { skipped++; continue; }

          // Send raw names — backend resolves IDs and checks duplicates
          rows.push({
            name,
            description:  desc,
            assigneeName: assign,
            statusName:   status,
          });
          valid++;
        }

        if (valid === 0) {
          setParseError("No valid rows found. Check that assignee names exactly match your staff list.");
          return;
        }

        // Store in ref — does NOT trigger re-render, browser stays fast
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

  // ── Upload — batches of 100, cancel between batches ───────────────────────
  const handleDeleteAll = async () => {
    if (!window.confirm('Delete ALL tasks? This cannot be undone.')) return;
    setDeletingAll(true);
    setDeleteAllMsg('');
    try {
      const res = await api.delete('/tasks/all');
      setDeleteAllMsg('deleted:' + res.data.deleted);
    } catch {
      setDeleteAllMsg('error');
    } finally {
      setDeletingAll(false);
    }
  };

  const handleUpload = async () => {
    const rows = parsedRef.current;
    if (!rows.length) return;

    const batches = [];
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      batches.push(rows.slice(i, i + BATCH_SIZE));
    }

    cancelRef.current = false;
    setUploading(true);
    setDone(false);
    setTotalCreated(0);
    setTotalFailed(0);
    setCurrentBatch(0);
    setTotalBatches(batches.length);

    let created = 0;
    let failed  = 0;

    for (let b = 0; b < batches.length; b++) {
      if (cancelRef.current) break;

      setCurrentBatch(b + 1);

      try {
        const res = await api.post("/tasks/bulk", {
          tasks:   batches[b],
          project: selectedProjectId || null,
        });
        created += res.data.created || 0;
        failed  += res.data.failed  || 0;
      } catch {
        failed += batches[b].length;
      }

      setTotalCreated(created);
      setTotalFailed(failed);
    }

    setUploading(false);
    setDone(true);
  };

  const handleCancel = () => { cancelRef.current = true; };

  const progressPct = totalBatches > 0 ? Math.round((currentBatch / totalBatches) * 100) : 0;
  const wasCancelled = done && cancelRef.current;

  const downloadSample = () => {
    const sample = [
      { name: "Design landing page", description: "Create wireframes", assignee: "John Doe",   status: "Pending"     },
      { name: "Fix login bug",       description: "Token not refreshing", assignee: "Jane Smith", status: "In Progress" },
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tasks");
    XLSX.writeFile(wb, "bulk_tasks_sample.xlsx");
  };

  return (
    <Box bg={cardBg} p={6} borderRadius="md" boxShadow="md" maxW="560px" mx="auto">

      {/* Header */}
      <Flex justify="space-between" align="center" mb={6}>
        <HStack>
          <IconButton icon={<MdArrowBack size={18} />} size="sm" variant="ghost"
            aria-label="Back" onClick={() => navigate("/admin/tasks")} />
          <Heading size="md" color={textColor}>Bulk Upload Tasks</Heading>
        </HStack>
        <HStack>
          <Button size="sm" leftIcon={<MdDownload size={15} />} variant="outline"
            colorScheme="brand" onClick={downloadSample}>
            Sample
          </Button>
          <Button size="sm" leftIcon={<MdDeleteSweep size={16} />} colorScheme="red"
            variant="outline" onClick={handleDeleteAll} isLoading={deletingAll}
            loadingText="Deleting...">
            Delete All
          </Button>
        </HStack>
      </Flex>

      <VStack spacing={5} align="stretch">

        {/* Delete All result */}
        {deleteAllMsg && (
          <Alert status={deleteAllMsg.startsWith('deleted') ? 'info' : 'error'} borderRadius="lg">
            <AlertIcon />
            <AlertDescription fontSize="sm">
              {deleteAllMsg.startsWith('deleted')
                ? 'Deleted ' + deleteAllMsg.split(':')[1] + ' task(s) successfully.'
                : 'Failed to delete tasks.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Project select */}
        <Box>
          <Text fontSize="sm" fontWeight="600" color={textColor} mb={2}>Project (optional)</Text>
          <Select placeholder="No project" value={selectedProjectId}
            onChange={e => setSelectedProjectId(e.target.value)}>
            {(projects || []).map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
          </Select>
        </Box>

        {/* Upload zone */}
        <Box>
          <Text fontSize="sm" fontWeight="600" color={textColor} mb={2}>Excel File</Text>
          <Flex direction="column" align="center" justify="center" p={8} borderRadius="xl"
            border={`2px dashed ${uploadBorder}`} bg={uploadBoxBg}
            cursor={uploading ? "not-allowed" : "pointer"} gap={2}
            onClick={() => !uploading && fileInputRef.current?.click()}
            _hover={!uploading ? { borderColor: "brand.400" } : {}}
            transition="border-color 0.2s">
            <MdUploadFile size={36} color="#63b3ed" />
            <Text fontWeight="500" color={textColor} fontSize="sm" textAlign="center">
              {fileName ? `📄 ${fileName}` : "Click to select .xlsx / .xls file"}
            </Text>
            <Text fontSize="xs" color={subColor}>
              Columns: <b>name</b>, <b>description</b>, <b>assignee</b>, <b>status</b>
            </Text>
            <Input ref={fileInputRef} type="file" accept=".xlsx,.xls"
              display="none" onChange={handleFileChange} />
          </Flex>
        </Box>

        {/* Parse error */}
        {parseError && (
          <Alert status="error" borderRadius="lg">
            <AlertIcon /><AlertDescription fontSize="sm">{parseError}</AlertDescription>
          </Alert>
        )}

        {/* File ready — show counts only, no table */}
        {fileReady && !uploading && !done && (
          <Box p={4} borderRadius="xl" border={`1px solid ${borderColor}`} bg={uploadBoxBg}>
            <Flex justify="space-between" align="center">
              <VStack align="flex-start" spacing={1}>
                <HStack>
                  <Badge colorScheme="green" borderRadius="full" px={2}>✅ {rowCount} ready</Badge>
                  {skippedCount > 0 && (
                    <Badge colorScheme="orange" borderRadius="full" px={2}>⚠ {skippedCount} skipped</Badge>
                  )}
                </HStack>
                {skippedCount > 0 && (
                  <Text fontSize="xs" color={subColor}>
                    Skipped rows had missing names or unmatched assignees.
                  </Text>
                )}
                <Text fontSize="xs" color={subColor}>
                  {Math.ceil(rowCount / BATCH_SIZE)} batch{Math.ceil(rowCount / BATCH_SIZE) !== 1 ? "es" : ""} of {BATCH_SIZE} rows each
                </Text>
              </VStack>
              <Button colorScheme="brand" leftIcon={<MdUploadFile size={16} />}
                onClick={handleUpload} size="sm">
                Upload
              </Button>
            </Flex>
          </Box>
        )}

        {/* Progress */}
        {uploading && (
          <Box p={4} borderRadius="xl" border={`1px solid ${borderColor}`} bg={uploadBoxBg}>
            <Flex justify="space-between" align="center" mb={3}>
              <Text fontSize="sm" fontWeight="600" color={textColor}>
                Batch {currentBatch} / {totalBatches}
              </Text>
              <HStack spacing={3}>
                <Text fontSize="xs" color="green.500" fontWeight="600">✅ {totalCreated}</Text>
                {totalFailed > 0 && <Text fontSize="xs" color="red.400" fontWeight="600">❌ {totalFailed}</Text>}
                <Button size="xs" colorScheme="red" variant="outline"
                  leftIcon={<MdClose size={12} />} onClick={handleCancel}>
                  Cancel
                </Button>
              </HStack>
            </Flex>
            <Progress value={progressPct} size="sm" colorScheme="brand"
              borderRadius="full" hasStripe isAnimated />
            <Text fontSize="xs" color={subColor} mt={1} textAlign="right">{progressPct}%</Text>
          </Box>
        )}

        {/* Done */}
        {done && (
          <Alert status={wasCancelled ? "warning" : totalFailed > 0 ? "warning" : "success"}
            borderRadius="xl">
            <AlertIcon />
            <Box>
              <Text fontSize="sm" fontWeight="600">
                {wasCancelled
                  ? `Cancelled — ${totalCreated} task${totalCreated !== 1 ? "s" : ""} created before stop`
                  : totalFailed > 0
                    ? `${totalCreated} created, ${totalFailed} failed`
                    : `✅ ${totalCreated} task${totalCreated !== 1 ? "s" : ""} created!`}
              </Text>
              {!wasCancelled && totalFailed === 0 && (
                <Text fontSize="xs" mt={1}>Redirecting to tasks…</Text>
              )}
            </Box>
          </Alert>
        )}

        {done && totalFailed === 0 && !wasCancelled && (
          setTimeout(() => navigate("/admin/tasks"), 1800) && null
        )}

        {/* Reset / go back after done */}
        {done && (
          <HStack justify="flex-end">
            <Button size="sm" variant="outline" onClick={reset}>Upload Another</Button>
            <Button size="sm" colorScheme="brand" onClick={() => navigate("/admin/tasks")}>
              Go to Tasks
            </Button>
          </HStack>
        )}

      </VStack>
    </Box>
  );
}