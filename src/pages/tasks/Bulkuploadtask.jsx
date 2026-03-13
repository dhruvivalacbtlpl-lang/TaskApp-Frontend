import { useState, useRef, useEffect } from "react";
import {
  Box, Flex, Heading, Button, Select, Text, Alert, AlertIcon,
  AlertDescription, useColorModeValue, Input, IconButton,
  HStack, VStack, Spinner,
} from "@chakra-ui/react";
import { MdUploadFile, MdDownload, MdArrowBack, MdDeleteSweep } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";

export default function BulkUploadTask() {
  const navigate = useNavigate();
  const { selectedProject, projects } = useAuth();

  const [projectId, setProjectId]     = useState(selectedProject?._id || "");
  const [fileName, setFileName]       = useState("");
  const [fileReady, setFileReady]     = useState(false);
  const [uploading, setUploading]     = useState(false);
  const [result, setResult]           = useState(null);   // { created, skipped } | null
  const [error, setError]             = useState("");
  const [deletingAll, setDeletingAll] = useState(false);
  const [deleteMsg, setDeleteMsg]     = useState("");

  const fileRef      = useRef(null);
  const fileInputRef = useRef(null);
  // Guard against double-submit
  const uploadingRef = useRef(false);

  const bg      = useColorModeValue("white", "gray.800");
  const text    = useColorModeValue("gray.800", "white");
  const sub     = useColorModeValue("gray.500", "gray.400");
  const border  = useColorModeValue("#e5e7eb", "#4a5568");
  const zoneBg  = useColorModeValue("gray.50", "gray.700");
  const zoneBdr = useColorModeValue("#bee3f8", "#4a5568");

  const reset = () => {
    setFileName(""); setFileReady(false); setResult(null); setError("");
    fileRef.current = null;
    uploadingRef.current = false;
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    reset();
    fileRef.current = file;
    setFileName(file.name);
    setFileReady(true);
    e.target.value = "";
  };

  const handleUpload = async () => {
    // Prevent double-submit on rapid clicks or re-renders
    if (!fileRef.current || uploadingRef.current) return;
    uploadingRef.current = true;
    setUploading(true);
    setResult(null);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", fileRef.current);
      if (projectId) fd.append("project", projectId);
      const res = await api.post("/tasks/bulk", fd);
      setResult({ created: res.data.created || 0, skipped: res.data.skipped || 0 });
    } catch (err) {
      setError(err?.response?.data?.error || "Upload failed. Check the server.");
      uploadingRef.current = false;
    } finally {
      setUploading(false);
    }
  };

  // ✅ Auto-redirect using useEffect — NOT inline JSX (which fires on every render)
  const isSuccess = !!result && result.created > 0 && result.skipped === 0;
  useEffect(() => {
    if (!isSuccess) return;
    const t = setTimeout(() => navigate("/admin/tasks"), 1800);
    return () => clearTimeout(t);
  }, [isSuccess]);

  const handleDeleteAll = async () => {
    if (!window.confirm("Delete ALL tasks? This cannot be undone.")) return;
    setDeletingAll(true);
    setDeleteMsg("");
    try {
      const res = await api.delete("/tasks/all");
      setDeleteMsg(`✅ Deleted ${res.data.deleted} task(s).`);
    } catch {
      setDeleteMsg("❌ Failed to delete.");
    } finally {
      setDeletingAll(false);
    }
  };

  const downloadSample = () => {
    const ws = XLSX.utils.json_to_sheet([
      { name: "Design landing page", description: "Create wireframes",    assignee: "John Doe",   status: "Pending"     },
      { name: "Fix login bug",       description: "Token not refreshing", assignee: "Jane Smith", status: "In Progress" },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tasks");
    XLSX.writeFile(wb, "bulk_tasks_sample.xlsx");
  };

  const isDone = !!result;

  return (
    <Box bg={bg} p={6} borderRadius="xl" boxShadow="md" maxW="520px" mx="auto">

      {/* Header */}
      <Flex justify="space-between" align="center" mb={6}>
        <HStack>
          <IconButton icon={<MdArrowBack />} size="sm" variant="ghost"
            aria-label="Back" onClick={() => navigate("/admin/tasks")} />
          <Heading size="md" color={text}>Bulk Upload Tasks</Heading>
        </HStack>
        <HStack>
          <Button size="sm" leftIcon={<MdDownload />} variant="outline" colorScheme="blue"
            onClick={downloadSample}>
            Sample
          </Button>
          <Button size="sm" leftIcon={<MdDeleteSweep />} variant="outline" colorScheme="red"
            onClick={handleDeleteAll} isLoading={deletingAll} loadingText="Deleting…">
            Delete All
          </Button>
        </HStack>
      </Flex>

      <VStack spacing={4} align="stretch">

        {/* Delete All feedback */}
        {deleteMsg && (
          <Alert status={deleteMsg.startsWith("✅") ? "info" : "error"} borderRadius="lg">
            <AlertIcon />
            <AlertDescription fontSize="sm">{deleteMsg}</AlertDescription>
          </Alert>
        )}

        {/* Project */}
        <Box>
          <Text fontSize="sm" fontWeight="600" color={text} mb={1}>Project (optional)</Text>
          <Select placeholder="No project" value={projectId}
            onChange={e => setProjectId(e.target.value)}
            isDisabled={uploading}>
            {(projects || []).map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
          </Select>
        </Box>

        {/* Drop zone */}
        <Box>
          <Text fontSize="sm" fontWeight="600" color={text} mb={1}>Excel File</Text>
          <Flex direction="column" align="center" justify="center" gap={2} p={8}
            borderRadius="xl" border={`2px dashed ${zoneBdr}`} bg={zoneBg}
            cursor={uploading ? "not-allowed" : "pointer"}
            onClick={() => !uploading && fileInputRef.current?.click()}
            _hover={!uploading ? { borderColor: "blue.400" } : {}}
            transition="border-color 0.2s">
            <MdUploadFile size={38} color="#63b3ed" />
            <Text fontSize="sm" fontWeight="500" color={text} textAlign="center">
              {fileName ? `📄 ${fileName}` : "Click to pick .xlsx / .xls file"}
            </Text>
            <Text fontSize="xs" color={sub}>
              Required columns: <b>name</b>, <b>assignee</b> — optional: description, status
            </Text>
            <Input ref={fileInputRef} type="file" accept=".xlsx,.xls"
              display="none" onChange={handleFile} />
          </Flex>
        </Box>

        {/* Ready bar */}
        {fileReady && !uploading && !isDone && (
          <Flex justify="space-between" align="center" px={4} py={3}
            borderRadius="xl" border={`1px solid ${border}`} bg={zoneBg}>
            <Text fontSize="sm" color={text} fontWeight="500">📄 {fileName}</Text>
            <Button size="sm" colorScheme="blue" leftIcon={<MdUploadFile />}
              onClick={handleUpload} isDisabled={uploading}>
              Upload
            </Button>
          </Flex>
        )}

        {/* Uploading */}
        {uploading && (
          <Flex align="center" justify="center" gap={3} py={4}
            borderRadius="xl" border={`1px solid ${border}`} bg={zoneBg}>
            <Spinner size="sm" color="blue.500" />
            <Text fontSize="sm" color={text} fontWeight="500">Uploading…</Text>
          </Flex>
        )}

        {/* Error */}
        {error && (
          <Alert status="error" borderRadius="xl">
            <AlertIcon />
            <AlertDescription fontSize="sm">{error}</AlertDescription>
          </Alert>
        )}

        {/* Result */}
        {isDone && (
          <Alert
            status={result.created === 0 ? "warning" : result.skipped > 0 ? "warning" : "success"}
            borderRadius="xl">
            <AlertIcon />
            <Box>
              <Text fontSize="sm" fontWeight="600">
                {result.created === 0
                  ? "No tasks created — all rows were duplicates or had unmatched assignees."
                  : result.skipped > 0
                    ? `${result.created} created, ${result.skipped} skipped (duplicates / unmatched assignees)`
                    : `✅ ${result.created} task${result.created !== 1 ? "s" : ""} created!`}
              </Text>
              {isSuccess && (
                <Text fontSize="xs" color="green.600" mt={1}>Redirecting to Tasks…</Text>
              )}
            </Box>
          </Alert>
        )}

        {/* Actions */}
        {isDone && (
          <HStack justify="flex-end">
            <Button size="sm" variant="outline" onClick={reset}>Upload Another</Button>
            <Button size="sm" colorScheme="blue" onClick={() => navigate("/admin/tasks")}>
              Go to Tasks
            </Button>
          </HStack>
        )}

      </VStack>
    </Box>
  );
}