// pages/admin/IssuesPage.jsx
import { useState, useEffect } from "react";
import {
  Box, Flex, Heading, Text, Badge, Avatar, Spinner,
  Button, Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalCloseButton, ModalBody, ModalFooter, useDisclosure,
  Input, Textarea, Select, useToast, IconButton, Grid, GridItem,
} from "@chakra-ui/react";
import { MdAdd, MdDelete, MdEdit, MdBugReport } from "react-icons/md";
import api from "../../api";

const priorityColors = {
  low: "green", medium: "yellow", high: "orange", critical: "red",
};

const severityColors = {
  minor: "green", moderate: "yellow", major: "orange", critical: "red",
};

const issueTypeColors = {
  bug: "red", feature: "blue", improvement: "purple",
};

const empty = {
  name: "", description: "", taskStatus: "", assignee: "",
  project: "", priority: "medium", issueType: "bug",
  severity: "minor", dueDate: "",
};

export default function IssuesPage() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const fetchIssues = async () => {
    try {
      const res = await api.get("/tasks/issues/all");
      setIssues(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
    const fetchMeta = async () => {
      try {
        const [s, st, p] = await Promise.all([
          api.get("/staff"),
          api.get("/task-status"),
          api.get("/projects"),
        ]);
        setStaff(s.data || []);
        setStatuses(st.data || []);
        setProjects(p.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchMeta();
  }, []);

  const handleOpen = (issue = null) => {
    if (issue) {
      setForm({
        name: issue.name,
        description: issue.description,
        taskStatus: issue.taskStatus?._id || "",
        assignee: issue.assignee?._id || "",
        project: issue.project?._id || "",
        priority: issue.priority || "medium",
        issueType: issue.issueType || "bug",
        severity: issue.severity || "minor",
        dueDate: issue.dueDate ? issue.dueDate.split("T")[0] : "",
      });
      setEditingId(issue._id);
    } else {
      setForm(empty);
      setEditingId(null);
    }
    onOpen();
  };

  const handleSave = async () => {
    if (!form.name || !form.description || !form.assignee) {
      toast({ title: "Name, description and assignee are required", status: "warning", duration: 2000 });
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const res = await api.put(`/tasks/${editingId}`, form);
        setIssues(prev => prev.map(i => i._id === editingId ? res.data : i));
        toast({ title: "Issue updated!", status: "success", duration: 2000 });
      } else {
        const res = await api.post("/tasks/issues/create", form);
        setIssues(prev => [res.data, ...prev]);
        toast({ title: "Issue created!", status: "success", duration: 2000 });
      }
      onClose();
      setForm(empty);
      setEditingId(null);
    } catch (err) {
      toast({ title: "Failed to save issue", status: "error", duration: 2000 });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/tasks/${id}`);
      setIssues(prev => prev.filter(i => i._id !== id));
      toast({ title: "Issue deleted", status: "info", duration: 2000 });
    } catch {
      toast({ title: "Failed to delete", status: "error", duration: 2000 });
    }
  };

  if (loading) return (
    <Flex justify="center" py={20}><Spinner size="xl" color="red.500" /></Flex>
  );

  return (
    <Box>
      {/* HEADER */}
      <Box bg="white" p={6} borderRadius="xl" boxShadow="md" mb={6}>
        <Flex justify="space-between" align="center">
          <Flex align="center" gap={3}>
            <Box bg="red.100" p={3} borderRadius="lg">
              <MdBugReport size={26} color="#c53030" />
            </Box>
            <Box>
              <Heading size="md" color="gray.800">Issues</Heading>
              <Text fontSize="sm" color="gray.500">Track bugs, features & improvements</Text>
            </Box>
          </Flex>
          <Button leftIcon={<MdAdd />} colorScheme="red" size="sm" onClick={() => handleOpen()}>
            New Issue
          </Button>
        </Flex>
      </Box>

      {/* ISSUES LIST */}
      {!issues.length ? (
        <Flex direction="column" align="center" py={20} color="gray.400">
          <MdBugReport size={48} />
          <Text fontSize="sm" mt={2}>No issues found</Text>
        </Flex>
      ) : (
        <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }} gap={4}>
          {issues.map(issue => (
            <GridItem key={issue._id}>
              <Box bg="white" p={5} borderRadius="xl" boxShadow="md"
                border="1px solid #e2e8f0"
                _hover={{ transform: "translateY(-2px)", boxShadow: "lg" }}
                transition="all 0.2s">

                {/* Top badges */}
                <Flex gap={2} mb={3} wrap="wrap">
                  {issue.issueType && (
                    <Badge colorScheme={issueTypeColors[issue.issueType]} borderRadius="full" fontSize="xs" px={2}>
                      {issue.issueType}
                    </Badge>
                  )}
                  {issue.priority && (
                    <Badge colorScheme={priorityColors[issue.priority]} borderRadius="full" fontSize="xs" px={2}>
                      {issue.priority}
                    </Badge>
                  )}
                  {issue.severity && (
                    <Badge colorScheme={severityColors[issue.severity]} borderRadius="full" fontSize="xs" px={2}>
                      {issue.severity}
                    </Badge>
                  )}
                </Flex>

                <Text fontWeight="700" fontSize="sm" color="gray.800" mb={1}>{issue.name}</Text>
                <Text fontSize="xs" color="gray.500" noOfLines={2} mb={3}>{issue.description}</Text>

                {/* Assignee */}
                <Flex align="center" gap={2} mb={2}>
                  <Avatar name={issue.assignee?.name} size="xs" bg="red.400" color="white" />
                  <Text fontSize="xs" color="gray.600">{issue.assignee?.name}</Text>
                </Flex>

                {/* Project & Status */}
                <Flex justify="space-between" align="center" mb={3}>
                  {issue.project?.name && (
                    <Text fontSize="xs" color="gray.400">📁 {issue.project.name}</Text>
                  )}
                  {issue.taskStatus?.name && (
                    <Badge colorScheme="blue" fontSize="xs" borderRadius="full">
                      {issue.taskStatus.name}
                    </Badge>
                  )}
                </Flex>

                {/* Due date */}
                {issue.dueDate && (
                  <Text fontSize="xs" color="gray.400" mb={3}>
                    📅 Due: {new Date(issue.dueDate).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric"
                    })}
                  </Text>
                )}

                {/* Actions */}
                <Flex justify="flex-end" gap={2}>
                  <IconButton icon={<MdEdit />} size="xs" colorScheme="blue" variant="ghost"
                    aria-label="Edit" onClick={() => handleOpen(issue)} />
                  <IconButton icon={<MdDelete />} size="xs" colorScheme="red" variant="ghost"
                    aria-label="Delete" onClick={() => handleDelete(issue._id)} />
                </Flex>
              </Box>
            </GridItem>
          ))}
        </Grid>
      )}

      {/* CREATE / EDIT MODAL */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingId ? "Edit Issue" : "New Issue"}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Flex direction="column" gap={3}>
              <Input placeholder="Issue name *" value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />

              <Textarea placeholder="Description *" value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} />

              <Select placeholder="Assignee *" value={form.assignee}
                onChange={e => setForm(p => ({ ...p, assignee: e.target.value }))}>
                {staff.map(s => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </Select>

              <Select placeholder="Project (optional)" value={form.project}
                onChange={e => setForm(p => ({ ...p, project: e.target.value }))}>
                {projects.map(proj => (
                  <option key={proj._id} value={proj._id}>{proj.name}</option>
                ))}
              </Select>

              <Select placeholder="Status" value={form.taskStatus}
                onChange={e => setForm(p => ({ ...p, taskStatus: e.target.value }))}>
                {statuses.map(s => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </Select>

              <Grid templateColumns="repeat(3, 1fr)" gap={3}>
                <Select value={form.issueType}
                  onChange={e => setForm(p => ({ ...p, issueType: e.target.value }))}>
                  <option value="bug">Bug</option>
                  <option value="feature">Feature</option>
                  <option value="improvement">Improvement</option>
                </Select>

                <Select value={form.priority}
                  onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </Select>

                <Select value={form.severity}
                  onChange={e => setForm(p => ({ ...p, severity: e.target.value }))}>
                  <option value="minor">Minor</option>
                  <option value="moderate">Moderate</option>
                  <option value="major">Major</option>
                  <option value="critical">Critical</option>
                </Select>
              </Grid>

              <Input type="date" value={form.dueDate}
                onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} />
            </Flex>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>Cancel</Button>
            <Button colorScheme="red" isLoading={saving} onClick={handleSave}>
              {editingId ? "Update" : "Create"} Issue
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}