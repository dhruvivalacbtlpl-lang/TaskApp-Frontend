import { useState, useRef } from "react";
import {
  Box, Flex, Heading, Text, Button, VStack, HStack, Badge,
  Alert, AlertIcon, AlertDescription, Progress, useColorModeValue,
  useToast, Input,
} from "@chakra-ui/react";
import { MdCloudUpload, MdUploadFile, MdDownload, MdArrowBack } from "react-icons/md";
import * as XLSX from "xlsx";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

const CHUNK_SIZE = 5_000;

export default function BulkUploadTasks() {
  const { selectedProject } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const fileInputRef = useRef(null);
  const bulkParsedRef = useRef([]);

  const [bulkFile,      setBulkFile]      = useState(null);
  const [bulkRows,      setBulkRows]      = useState(0);
  const [bulkSkipped,   setBulkSkipped]   = useState(0);
  const [bulkReady,     setBulkReady]     = useState(false);
  const [bulkError,     setBulkError]     = useState("");
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkProgress,  setBulkProgress]  = useState(0);
  const [bulkResult,    setBulkResult]    = useState(null);
  const [bulkDone,      setBulkDone]      = useState(false);

  // ── colors ─────────────────────────────────────────────────────────────────
  const cardBg   = useColorModeValue("white",      "gray.800");
  const text     = useColorModeValue("gray.800",   "white");
  const sub      = useColorModeValue("gray.500",   "gray.400");
  const border   = useColorModeValue("#e2e8f0",    "#4a5568");
  const upBg     = useColorModeValue("gray.50",    "gray.750");
  const grnBg    = useColorModeValue("green.50",   "green.900");
  const blueBg   = useColorModeValue("blue.50",    "blue.900");
  const blueBdr  = useColorModeValue("#bee3f8",    "#2a4365");
  const blueClr  = useColorModeValue("blue.700",   "blue.200");
  const progressBg = useColorModeValue("gray.50",  "gray.700");

  // ── reset ──────────────────────────────────────────────────────────────────
  const reset = () => {
    setBulkFile(null); setBulkRows(0); setBulkSkipped(0);
    setBulkReady(false); setBulkError(""); setBulkUploading(false);
    setBulkProgress(0); setBulkResult(null); setBulkDone(false);
    bulkParsedRef.current = [];
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── parse xlsx on frontend ─────────────────────────────────────────────────
  const handleFilePick = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    reset();
    setBulkFile(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb  = XLSX.read(evt.target.result, { type: "binary" });
        const ws  = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { defval: "" });

        const rows = [];
        let skip = 0;

        for (const row of raw) {
          const r = Object.fromEntries(
            Object.entries(row).map(([k, v]) => [k.trim().toLowerCase(), v])
          );

          const name   = String(r.name || r.title || r["task name"] || "").trim();
          const assign = String(r.assignee || r["assigned to"] || r.staff || "").trim();

          if (!name || !assign) { skip++; continue; }

          rows.push({
            name,
            assigneeName: assign,
            description:  String(r.description || r.desc || "").trim(),
            statusName:   String(r.status || r["task status"] || "").trim(),
          });
        }

        if (rows.length === 0) {
          setBulkError("No valid rows found. File must have 'name' and 'assignee' columns.");
          setBulkFile(null); return;
        }

        bulkParsedRef.current = rows;
        setBulkRows(rows.length);
        setBulkSkipped(skip);
        setBulkReady(true);
      } catch {
        setBulkError("Cannot read file. Must be a valid .xlsx or .xls file.");
        setBulkFile(null);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  // ── chunked JSON upload ────────────────────────────────────────────────────
  const handleUpload = async () => {
    const rows = bulkParsedRef.current;
    if (!rows.length) return;

    setBulkUploading(true); setBulkDone(false);
    setBulkProgress(0); setBulkResult(null);

    const projectId = selectedProject?._id || null;

    // split into 5000-row chunks
    const chunks = [];
    for (let i = 0; i < rows.length; i += CHUNK_SIZE)
      chunks.push(rows.slice(i, i + CHUNK_SIZE));

    let totalCreated = 0, totalFailed = 0, totalDupes = 0, unmatched = [];

    for (let i = 0; i < chunks.length; i++) {
      try {
        const res = await api.post(
          "/tasks/bulk",
          { tasks: chunks[i], project: projectId },
          { timeout: 120_000 }
        );
        totalCreated += res.data.created    || 0;
        totalFailed  += res.data.failed     || 0;
        totalDupes   += res.data.duplicates || 0;
        if (res.data.unmatchedAssignees?.length)
          unmatched = [...new Set([...unmatched, ...res.data.unmatchedAssignees])];
      } catch {
        totalFailed += chunks[i].length;
      }
      setBulkProgress(Math.round(((i + 1) / chunks.length) * 100));
    }

    setBulkResult({
      created:    totalCreated,
      failed:     totalFailed,
      duplicates: totalDupes,
      unmatched:  unmatched.slice(0, 10),
    });

    if (totalCreated > 0) {
      toast({ title: `✅ ${totalCreated.toLocaleString()} tasks uploaded!`, status: "success", duration: 3000 });
    }

    setBulkUploading(false);
    setBulkDone(true);
  };

  // ── sample download ────────────────────────────────────────────────────────
  const downloadSample = () => {
    const ws = XLSX.utils.json_to_sheet([
      { name: "Design landing page",  description: "Create mockup in Figma",    assignee: "John Doe",   status: "Pending"     },
      { name: "Fix login bug",        description: "Fails on Safari mobile",    assignee: "Jane Smith", status: "In Progress" },
      { name: "Write unit tests",     description: "Cover auth module 80%",     assignee: "John Doe",   status: "Pending"     },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tasks");
    XLSX.writeFile(wb, "bulk_tasks_sample.xlsx");
  };

  const totalChunks = Math.ceil(bulkRows / CHUNK_SIZE);

  return (
    <Box maxW="600px" mx="auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <Flex align="center" gap={3} mb={6}>
        <Button leftIcon={<MdArrowBack/>} variant="ghost" size="sm"
          onClick={() => navigate("/admin/tasks")}>
          Back
        </Button>
        <Box>
          <Heading size="md" color={text}>📤 Bulk Upload Tasks</Heading>
          <Text fontSize="xs" color={sub}>
            Chunked JSON · {CHUNK_SIZE.toLocaleString()} rows/request · no 413 errors
          </Text>
        </Box>
      </Flex>

      <Box bg={cardBg} p={6} borderRadius="xl" boxShadow="md">
        <VStack spacing={5} align="stretch">

          {/* Project badge */}
          {selectedProject ? (
            <Box px={3} py={2} bg={blueBg} borderRadius="lg" border={`1px solid ${blueBdr}`}>
              <Text fontSize="xs" color={blueClr} fontWeight="600">📁 {selectedProject.name}</Text>
              <Text fontSize="xs" color={blueClr} opacity={0.8}>Tasks will be linked to this project</Text>
            </Box>
          ) : (
            <Alert status="warning" borderRadius="lg" py={2}>
              <AlertIcon/>
              <AlertDescription fontSize="xs">
                No project selected — tasks won't be linked to any project.
              </AlertDescription>
            </Alert>
          )}

          {/* Drop zone */}
          {!bulkUploading && !bulkDone && (
            <Box
              onClick={() => fileInputRef.current?.click()}
              cursor="pointer" p={10} borderRadius="xl"
              border="2px dashed"
              borderColor={bulkFile ? "green.400" : "gray.300"}
              bg={bulkFile ? grnBg : upBg}
              textAlign="center" transition="all 0.2s"
              _hover={{ borderColor: "brand.400", bg: blueBg }}>
              <MdCloudUpload size={44} color={bulkFile ? "#38a169" : "#a0aec0"} style={{ margin: "0 auto 10px" }}/>
              <Text fontWeight="600" fontSize="sm" color={bulkFile ? "green.600" : text} mb={1}>
                {bulkFile ? `📄 ${bulkFile.name}` : "Click to choose .xlsx or .xls file"}
              </Text>
              <Text fontSize="xs" color={sub}>
                Required columns: <b>name</b>, <b>assignee</b>
              </Text>
              <Text fontSize="xs" color={sub}>
                Optional: description, status
              </Text>
              <Input
                ref={fileInputRef} type="file" accept=".xlsx,.xls"
                display="none" onChange={handleFilePick}/>
            </Box>
          )}

          {/* Error */}
          {bulkError && (
            <Alert status="error" borderRadius="lg">
              <AlertIcon/><AlertDescription fontSize="sm">{bulkError}</AlertDescription>
            </Alert>
          )}

          {/* Ready state */}
          {bulkReady && !bulkUploading && !bulkDone && (
            <Box p={4} borderRadius="xl" border="1px solid" borderColor="green.200" bg={grnBg}>
              <HStack spacing={2} mb={1}>
                <Badge colorScheme="green" borderRadius="full" px={3} py={1} fontSize="xs">
                  ✅ {bulkRows.toLocaleString()} valid rows
                </Badge>
                {bulkSkipped > 0 && (
                  <Badge colorScheme="orange" borderRadius="full" px={3} py={1} fontSize="xs">
                    ⚠ {bulkSkipped} skipped (missing name/assignee)
                  </Badge>
                )}
              </HStack>
              <Text fontSize="xs" color="green.700" _dark={{ color: "green.300" }}>
                Will upload in {totalChunks} chunk{totalChunks > 1 ? "s" : ""} × {CHUNK_SIZE.toLocaleString()} rows — safe for any proxy/tunnel
              </Text>
            </Box>
          )}

          {/* Uploading progress */}
          {bulkUploading && (
            <Box p={5} borderRadius="xl" border="1px solid" borderColor="brand.200"
              bg={progressBg}>
              <Flex justify="space-between" align="center" mb={2}>
                <VStack align="flex-start" spacing={0}>
                  <Text fontSize="sm" fontWeight="700" color={text}>
                    Uploading {bulkRows.toLocaleString()} tasks…
                  </Text>
                  <Text fontSize="xs" color={sub}>
                    Chunk {Math.min(Math.ceil(bulkProgress / (100 / totalChunks)), totalChunks)} of {totalChunks}
                  </Text>
                </VStack>
                <Text fontSize="2xl" fontWeight="800" color="brand.500">{bulkProgress}%</Text>
              </Flex>
              <Progress value={bulkProgress} colorScheme="brand" borderRadius="full"
                size="lg" hasStripe isAnimated
                sx={{ "& > div": { transition: "width 0.1s linear" } }}/>
              <Text fontSize="xs" color={sub} mt={2} textAlign="center">
                Do not close this window
              </Text>
            </Box>
          )}

          {/* Result */}
          {bulkDone && bulkResult && (
            <Box p={4} borderRadius="xl" border="1px solid"
              borderColor={bulkResult.created > 0 ? "green.200" : "orange.200"}
              bg={bulkResult.created > 0 ? grnBg : useColorModeValue("orange.50", "orange.900")}>
              <Text fontSize="sm" fontWeight="700" mb={2}
                color={bulkResult.created > 0 ? "green.700" : "orange.600"}>
                {bulkResult.created > 0
                  ? `✅ ${bulkResult.created.toLocaleString()} task${bulkResult.created !== 1 ? "s" : ""} uploaded!`
                  : bulkResult.unmatched?.length > 0
                    ? "❌ Assignee names not found in Staff"
                    : "⚠️ 0 inserted — check assignee names match Staff exactly"}
              </Text>
              <HStack spacing={2} wrap="wrap" mb={bulkResult.unmatched?.length > 0 ? 3 : 0}>
                {bulkResult.created > 0 && (
                  <Badge colorScheme="green" borderRadius="full" px={2} py={1} fontSize="xs">
                    ✅ {bulkResult.created.toLocaleString()} created
                  </Badge>
                )}
                {bulkResult.duplicates > 0 && (
                  <Badge colorScheme="orange" borderRadius="full" px={2} py={1} fontSize="xs">
                    ⚠ {bulkResult.duplicates.toLocaleString()} duplicates
                  </Badge>
                )}
                {bulkResult.failed > 0 && (
                  <Badge colorScheme="red" borderRadius="full" px={2} py={1} fontSize="xs">
                    ❌ {bulkResult.failed.toLocaleString()} failed
                  </Badge>
                )}
              </HStack>
              {bulkResult.unmatched?.length > 0 && (
                <Box p={3} bg="red.100" borderRadius="lg" _dark={{ bg: "red.800" }}>
                  <Text fontSize="xs" fontWeight="700" color="red.700" mb={1}>
                    Assignee names not found in Staff:
                  </Text>
                  {bulkResult.unmatched.map(n => (
                    <Text key={n} fontSize="xs" color="red.600" fontFamily="mono">• "{n}"</Text>
                  ))}
                  <Text fontSize="xs" color="red.500" mt={2} fontWeight="600">
                    Add these names to Staff → re-upload
                  </Text>
                </Box>
              )}
              {bulkResult.created > 0 && (
                <Text fontSize="xs" color="green.600" mt={2}>
                  ✓ Go to Tasks page to see your uploaded tasks
                </Text>
              )}
            </Box>
          )}

          {/* Action buttons */}
          <Flex justify="space-between" align="center" pt={2} borderTop={`1px solid ${border}`}>
            <Button size="sm" leftIcon={<MdDownload size={14}/>} variant="outline"
              onClick={downloadSample} isDisabled={bulkUploading}>
              Download Sample
            </Button>
            <HStack>
              {bulkDone ? (
                <>
                  <Button size="sm" variant="outline" onClick={reset}>Upload Another</Button>
                  <Button size="sm" colorScheme="brand" onClick={() => navigate("/admin/tasks")}>
                    View Tasks
                  </Button>
                </>
              ) : bulkReady && !bulkUploading ? (
                <Button colorScheme="brand" size="sm" leftIcon={<MdUploadFile size={14}/>}
                  onClick={handleUpload}>
                  Upload {bulkRows.toLocaleString()} Tasks
                </Button>
              ) : null}
            </HStack>
          </Flex>

        </VStack>
      </Box>

      {/* Column guide */}
      <Box mt={4} p={4} bg={cardBg} borderRadius="xl" boxShadow="sm">
        <Text fontSize="sm" fontWeight="600" color={text} mb={2}>📋 Column Reference</Text>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr style={{ background: useColorModeValue("#EBF8FF", "#2a4365") }}>
              {["Column", "Required", "Example"].map(h => (
                <th key={h} style={{ padding: "6px 10px", textAlign: "left", color: useColorModeValue("#2d3748", "white") }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { col: "name",        req: true,  ex: "Fix login bug"    },
              { col: "assignee",    req: true,  ex: "John Doe"         },
              { col: "description", req: false, ex: "Fails on Safari"  },
              { col: "status",      req: false, ex: "In Progress"      },
            ].map(({ col, req, ex }) => (
              <tr key={col}>
                <td style={{ padding: "6px 10px", borderBottom: `1px solid ${border}`, fontFamily: "monospace" }}>{col}</td>
                <td style={{ padding: "6px 10px", borderBottom: `1px solid ${border}` }}>
                  <Badge colorScheme={req ? "red" : "gray"} fontSize="10px">{req ? "Required" : "Optional"}</Badge>
                </td>
                <td style={{ padding: "6px 10px", borderBottom: `1px solid ${border}`, color: sub }}>{ex}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Text fontSize="xs" color={sub} mt={2}>
          ⚠️ Assignee name must exactly match the staff name in your system (case-insensitive).
        </Text>
      </Box>

    </Box>
  );
}