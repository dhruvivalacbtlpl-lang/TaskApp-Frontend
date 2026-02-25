import {
  Box, Flex, Heading, Input, Select, Button, Checkbox,
  Table, Thead, Tbody, Tr, Th, Td, Alert, AlertIcon, AlertDescription,
  useColorModeValue,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";

export default function UpdateRole() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();

  const [name, setName] = useState("");
  const [status, setStatus] = useState(1);
  const [modules, setModules] = useState({});
  const [permissions, setPermissions] = useState([]);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const cardBg    = useColorModeValue("white", "gray.800");
  const theadBg   = useColorModeValue("#bee3f8", "#2a4365");
  const textColor = useColorModeValue("gray.800", "white");
  const thColor   = useColorModeValue("blue.700", "white");

  useEffect(() => {
    fetchPermissions();
    fetchRole();
  }, [id]);

  const fetchPermissions = async () => {
    try {
      const res = await api.get("/permissions");
      const data = Array.isArray(res.data) ? res.data : [];
      const grouped = {};
      data.forEach((p) => {
        const [module, action] = p.value.split("_");
        const moduleKey = module.toLowerCase();
        if (!grouped[moduleKey]) grouped[moduleKey] = new Set();
        grouped[moduleKey].add(action);
      });
      const finalModules = {};
      Object.keys(grouped).forEach((m) => (finalModules[m] = Array.from(grouped[m])));
      setModules(finalModules);
    } catch (err) {
      setErrorMsg("Failed to fetch permissions.");
    }
  };

  const fetchRole = async () => {
    try {
      const res = await api.get(`/role/${id}`);
      setName(res.data.name);
      setStatus(res.data.status);
      setPermissions(res.data.permissions || []);
    } catch (err) {
      setErrorMsg("Failed to fetch role details.");
    }
  };

  const togglePerm = (module, action) => {
    const key = `${module}_${action}`;
    const readKey = `${module}_read`;
    setPermissions((prev) => {
      let updated = [...prev];
      if (updated.includes(key)) {
        updated = updated.filter((p) => p !== key);
        if (action === "read") {
          ["create", "update", "delete"].forEach((a) => {
            updated = updated.filter((p) => p !== `${module}_${a}`);
          });
        }
      } else {
        updated.push(key);
        if (action !== "read" && !updated.includes(readKey)) {
          updated.push(readKey);
        }
      }
      return updated;
    });
  };

  const handleUpdate = async () => {
    setErrorMsg(""); setSuccessMsg("");
    try {
      await api.put(`/role/${id}`, { name, status, permissions });
      await refreshProfile();
      setSuccessMsg("Role updated successfully!");
      setTimeout(() => navigate("/admin/roles"), 1500);
    } catch (err) {
      setErrorMsg("Failed to update role. Please try again.");
    }
  };

  return (
    <Box>
      <Heading size="md" mb="4" color={textColor}>Update Role</Heading>

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

      <Box bg={cardBg} p="6" borderRadius="md" mb="6">
        <Flex gap="4">
          <Box flex="1">
            <Heading size="xs" mb="1" color={textColor}>Name</Heading>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Box>
          <Box w="200px">
            <Heading size="xs" mb="1" color={textColor}>Status</Heading>
            <Select value={status} onChange={(e) => setStatus(Number(e.target.value))}>
              <option value={1}>Active</option>
              <option value={0}>Inactive</option>
            </Select>
          </Box>
        </Flex>
      </Box>

      <Box bg={cardBg} p="6" borderRadius="md">
        <Table size="sm">
          <Thead bg={theadBg}>
            <Tr>
              <Th color={thColor}>MODULE</Th>
              <Th color={thColor}>READ</Th>
              <Th color={thColor}>CREATE</Th>
              <Th color={thColor}>UPDATE</Th>
              <Th color={thColor}>DELETE</Th>
            </Tr>
          </Thead>
          <Tbody>
            {Object.keys(modules).map((module) => (
              <Tr key={module}>
                <Td color={textColor}>{module}</Td>
                {["read", "create", "update", "delete"].map((action) => (
                  <Td key={action}>
                    <Checkbox
                      isChecked={permissions.includes(`${module}_${action}`)}
                      onChange={() => togglePerm(module, action)}
                    />
                  </Td>
                ))}
              </Tr>
            ))}
          </Tbody>
        </Table>

        <Flex justify="flex-end" mt="6" gap={3}>
          <Button variant="outline" onClick={() => navigate("/admin/roles")}>Cancel</Button>
          <Button colorScheme="blue" onClick={handleUpdate}>Update Role</Button>
        </Flex>
      </Box>
    </Box>
  );
}