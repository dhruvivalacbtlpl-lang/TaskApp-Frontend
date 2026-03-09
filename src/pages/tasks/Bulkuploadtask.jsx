import { useEffect, useState, useRef } from "react";
import {
  Box, Flex, Heading, Button, Select, Text, Alert, AlertIcon,
  AlertDescription, useColorModeValue, Input, Table, Thead, Tbody,
  Tr, Th, Td, Badge, Spinner, IconButton, HStack,
} from "@chakra-ui/react";
import { MdUploadFile, MdDownload, MdDelete, MdArrowBack } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";

export default function BulkUploadTask() {
  const navigate = useNavigate();
  const { selectedProject, projects } = useAuth();

  const [selectedProjectId, setSelectedProjectId] = useState(
    selectedProject?._id || ""
  );
  const [staffList, setStaffList]     = useState([]);
  const [statuses, setStatuses]       = useState([]);
  const [parsedTasks, setParsedTasks] = useState([]);
  const [fileName, setFileName]       = useState("");
  const [uploading, setUploading]     = useState(false);
  const [successMsg, setSuccessMsg]   = useState("");
  const [errorMsg, setErrorMsg]       = useState("");
  const [rowErrors, setRowErrors]     = useState({});
  const fileInputRef = useRef(null);

  const cardBg      = useColorModeValue("white", "gray.800");
  const textColor   = useColorModeValue("gray.800", "white");
  const subColor    = useColorModeValue("gray.500", "gray.400");
  const theadBg     = useColorModeValue("#bee3f8", "#2a4365");
  const theadColor  = useColorModeValue("gray.700", "white");
  const borderColor = useColorModeValue("#e5e7eb", "#4a5568");
  const rowHoverBg  = useColorModeValue("#ebf8ff", "#2d3748");
  const uploadBoxBg = useColorModeValue("gray.50", "gray.700");
  const uploadBorder= useColorModeValue("#bee3f8", "#4a5568");

  useEffect(() => {
    api.get("/staff").then(r => setStaffList(r.data || [])).catch(console.error);
    api.get("/task-status").then(r => setStatuses(r.data || [])).catch(console.error);
  }, []);

  const showMsg = (type, msg) => {
    if (type === "success") { setSuccessMsg(msg); setErrorMsg(""); }
    else { setErrorMsg(msg); setSuccessMsg(""); }
    setTimeout(() => { setSuccessMsg(""); setErrorMsg(""); }, 4000);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setParsedTasks([]);
    setRowErrors({});

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb   = XLSX.read(evt.target.result, { type: "binary" });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

        const normalised = rows.map((row) => {
          const out = {};
          Object.keys(row).forEach((k) => { out[k.trim().toLowerCase()] = row[k]; });
          return out;
        });

        const tasks = normalised.map((row, i) => {
          const nameVal   = row["name"]        || row["title"]       || row["task name"] || "";
          const descVal   = row["description"] || row["desc"]        || "";
          const assignVal = row["assignee"]    || row["assigned to"] || row["staff"]     || "";
          const statusVal = row["status"]      || row["task status"] || "";

          const matchedStaff = staffList.find(
            (s) => s.name.toLowerCase() === String(assignVal).trim().toLowerCase()
          );
          const matchedStatus = statuses.find(
            (s) => s.name.toLowerCase() === String(statusVal).trim().toLowerCase()
          );

          return {
            _rowIndex:   i,
            name:        String(nameVal).trim(),
            description: String(descVal).trim(),
            assigneeRaw: String(assignVal).trim(),
            statusRaw:   String(statusVal).trim(),
            assigneeId:  matchedStaff?._id  || "",
            statusId:    matchedStatus?._id || "",
          };
        }).filter(t => t.name);

        if (tasks.length === 0) {
          showMsg("error", "No valid rows found. Make sure your sheet has a 'name' column.");
          return;
        }
        setParsedTasks(tasks);
      } catch {
        showMsg("error", "Failed to parse Excel file. Please check the format.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const updateRow = (index, field, value) => {
    setParsedTasks(prev =>
      prev.map((t, i) => i === index ? { ...t, [field]: value } : t)
    );
  };

  const removeRow = (index) => {
    setParsedTasks(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (parsedTasks.length === 0) {
      showMsg("error", "No tasks to upload. Please select an Excel file first.");
      return;
    }

    const errors = {};
    parsedTasks.forEach((t, i) => {
      if (!t.name)             errors[i] = "Task name is required.";
      else if (!t.description) errors[i] = "Description is required.";
      else if (!t.assigneeId)  errors[i] = `Assignee "${t.assigneeRaw}" not found. Select from dropdown.`;
      else if (!t.statusId)    errors[i] = `Status "${t.statusRaw}" not found. Select from dropdown.`;
    });

    if (Object.keys(errors).length > 0) {
      setRowErrors(errors);
      showMsg("error", "Some rows have errors. Fix them before uploading.");
      return;
    }
    setRowErrors({});

    setUploading(true);
    let successCount = 0;
    let failCount    = 0;
    const newErrors  = {};

    for (let i = 0; i < parsedTasks.length; i++) {
      const t = parsedTasks[i];
      try {
        await api.post("/tasks", {
          name:        t.name,
          description: t.description,
          assignee:    t.assigneeId,
          taskStatus:  t.statusId,
          project:     selectedProjectId || null,
          // ✅ Required enum fields — send valid defaults so backend doesn't reject
          priority:    "medium",
          issueType:   "bug",
          severity:    "minor",
        });
        successCount++;
      } catch (err) {
        failCount++;
        newErrors[i] = err.response?.data?.error || "Failed to create.";
      }
    }

    setUploading(false);

    if (failCount === 0) {
      showMsg("success", `✅ ${successCount} task${successCount !== 1 ? "s" : ""} created successfully!`);
      setParsedTasks([]);
      setFileName("");
      setTimeout(() => navigate("/admin/tasks"), 1800);
    } else {
      setRowErrors(newErrors);
      showMsg("error", `${successCount} created, ${failCount} failed. Fix the highlighted rows.`);
    }
  };

  const downloadSample = () => {
    const sampleData = [
      { name: "Design landing page", description: "Create wireframes and mockups", assignee: "John Doe", status: "Pending" },
      { name: "Fix login bug",       description: "Token not refreshing on expiry",  assignee: "Jane Smith", status: "In Progress" },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tasks");
    XLSX.writeFile(wb, "bulk_tasks_sample.xlsx");
  };

  return (
    <Box bg={cardBg} p={6} borderRadius="md" boxShadow="md">

      <Flex justify="space-between" align="center" mb={5}>
        <HStack>
          <IconButton
            icon={<MdArrowBack size={18} />}
            size="sm" variant="ghost" aria-label="Back"
            onClick={() => navigate("/admin/tasks")}
          />
          <Heading size="md" color={textColor}>📤 Bulk Upload Tasks</Heading>
        </HStack>
        <Button
          size="sm" leftIcon={<MdDownload size={16} />}
          variant="outline" colorScheme="brand"
          onClick={downloadSample}
        >
          Download Sample
        </Button>
      </Flex>

      {successMsg && (
        <Alert status="success" borderRadius="md" mb={4}>
          <AlertIcon /><AlertDescription>{successMsg}</AlertDescription>
        </Alert>
      )}
      {errorMsg && (
        <Alert status="error" borderRadius="md" mb={4}>
          <AlertIcon /><AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      <Box mb={5}>
        <Text fontWeight="600" fontSize="sm" color={textColor} mb={2}>
          Step 1 — Select Project (optional)
        </Text>
        <Select
          placeholder="No project (general tasks)"
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          maxW="360px"
        >
          {(projects || []).map((p) => (
            <option key={p._id} value={p._id}>{p.name}</option>
          ))}
        </Select>
        {selectedProjectId && (
          <Text fontSize="xs" color="brand.500" mt={1}>
            📁 Tasks will be added to: {projects?.find(p => p._id === selectedProjectId)?.name}
          </Text>
        )}
      </Box>

      <Box mb={5}>
        <Text fontWeight="600" fontSize="sm" color={textColor} mb={2}>
          Step 2 — Upload Excel File
        </Text>
        <Flex
          direction="column" align="center" justify="center"
          p={8} borderRadius="xl" border={`2px dashed ${uploadBorder}`}
          bg={uploadBoxBg} cursor="pointer" gap={3}
          onClick={() => fileInputRef.current?.click()}
          _hover={{ borderColor: "brand.400" }}
          transition="all 0.2s"
        >
          <MdUploadFile size={40} color="#63b3ed" />
          <Text fontWeight="500" color={textColor}>
            {fileName ? `📄 ${fileName}` : "Click to select Excel file (.xlsx / .xls)"}
          </Text>
          <Text fontSize="xs" color={subColor}>
            Required columns: <b>name</b>, <b>description</b>, <b>assignee</b>, <b>status</b>
          </Text>
          <Input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            display="none"
            onChange={handleFileChange}
          />
        </Flex>
      </Box>

      {parsedTasks.length > 0 && (
        <Box mb={5}>
          <Flex justify="space-between" align="center" mb={3}>
            <Text fontWeight="600" fontSize="sm" color={textColor}>
              Step 3 — Preview & Fix ({parsedTasks.length} task{parsedTasks.length !== 1 ? "s" : ""} found)
            </Text>
            <Button
              colorScheme="brand" leftIcon={<MdUploadFile size={16} />}
              onClick={handleUpload} isLoading={uploading}
              loadingText="Uploading..."
            >
              Upload All
            </Button>
          </Flex>

          <Box overflowX="auto">
            <Table size="sm" style={{ borderCollapse: "collapse" }}>
              <Thead>
                <Tr style={{ background: theadBg }}>
                  {["#", "Task Name", "Description", "Assignee", "Status", ""].map((h) => (
                    <Th key={h} style={{ color: theadColor, padding: "10px" }}>{h}</Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {parsedTasks.map((task, i) => (
                  <>
                    <Tr
                      key={i}
                      style={{ background: rowErrors[i] ? "rgba(254,178,178,0.15)" : "transparent" }}
                      onMouseEnter={e => e.currentTarget.style.background = rowErrors[i] ? "rgba(254,178,178,0.25)" : rowHoverBg}
                      onMouseLeave={e => e.currentTarget.style.background = rowErrors[i] ? "rgba(254,178,178,0.15)" : "transparent"}
                    >
                      <Td style={{ padding: "8px", borderBottom: `1px solid ${borderColor}`, color: textColor }}>
                        {i + 1}
                      </Td>
                      <Td style={{ padding: "8px", borderBottom: `1px solid ${borderColor}` }}>
                        <Input
                          size="xs" value={task.name}
                          onChange={(e) => updateRow(i, "name", e.target.value)}
                          placeholder="Task name"
                          isInvalid={rowErrors[i] && !task.name}
                        />
                      </Td>
                      <Td style={{ padding: "8px", borderBottom: `1px solid ${borderColor}` }}>
                        <Input
                          size="xs" value={task.description}
                          onChange={(e) => updateRow(i, "description", e.target.value)}
                          placeholder="Description"
                          isInvalid={rowErrors[i] && !task.description}
                        />
                      </Td>
                      <Td style={{ padding: "8px", borderBottom: `1px solid ${borderColor}` }}>
                        <Select
                          size="xs" value={task.assigneeId}
                          onChange={(e) => updateRow(i, "assigneeId", e.target.value)}
                          isInvalid={rowErrors[i] && !task.assigneeId}
                          minW="140px"
                        >
                          <option value="">
                            {task.assigneeRaw ? `⚠ ${task.assigneeRaw}` : "Select assignee"}
                          </option>
                          {staffList.map((s) => (
                            <option key={s._id} value={s._id}>{s.name}</option>
                          ))}
                        </Select>
                      </Td>
                      <Td style={{ padding: "8px", borderBottom: `1px solid ${borderColor}` }}>
                        <Select
                          size="xs" value={task.statusId}
                          onChange={(e) => updateRow(i, "statusId", e.target.value)}
                          isInvalid={rowErrors[i] && !task.statusId}
                          minW="130px"
                        >
                          <option value="">
                            {task.statusRaw ? `⚠ ${task.statusRaw}` : "Select status"}
                          </option>
                          {statuses.map((s) => (
                            <option key={s._id} value={s._id}>{s.name}</option>
                          ))}
                        </Select>
                      </Td>
                      <Td style={{ padding: "8px", borderBottom: `1px solid ${borderColor}` }}>
                        <IconButton
                          size="xs" colorScheme="red" variant="ghost"
                          icon={<MdDelete size={14} />} aria-label="Remove row"
                          onClick={() => removeRow(i)}
                        />
                      </Td>
                    </Tr>
                    {rowErrors[i] && (
                      <Tr key={`err-${i}`}>
                        <Td colSpan={6} style={{ padding: "4px 8px", borderBottom: `1px solid ${borderColor}` }}>
                          <Text fontSize="xs" color="red.400">⚠ {rowErrors[i]}</Text>
                        </Td>
                      </Tr>
                    )}
                  </>
                ))}
              </Tbody>
            </Table>
          </Box>

          <Flex justify="flex-end" mt={4}>
            <Button
              colorScheme="brand" leftIcon={<MdUploadFile size={16} />}
              onClick={handleUpload} isLoading={uploading}
              loadingText="Uploading..."
            >
              Upload {parsedTasks.length} Task{parsedTasks.length !== 1 ? "s" : ""}
            </Button>
          </Flex>
        </Box>
      )}

      {parsedTasks.length === 0 && (
        <Box mt={4} p={4} borderRadius="lg" bg={uploadBoxBg} border={`1px solid ${uploadBorder}`}>
          <Text fontSize="sm" fontWeight="600" color={textColor} mb={2}>📌 How it works</Text>
          <Text fontSize="xs" color={subColor} lineHeight="tall">
            1. Download the sample Excel file to see the required format.<br />
            2. Fill in your tasks — each row is one task.<br />
            3. <b>name</b>, <b>description</b>, <b>assignee</b> (exact staff name), <b>status</b> (exact status name) are required.<br />
            4. Upload your file — mismatched names can be fixed from the preview table.<br />
            5. Click <b>Upload All</b> to create all tasks at once.
          </Text>
        </Box>
      )}
    </Box>
  );
}