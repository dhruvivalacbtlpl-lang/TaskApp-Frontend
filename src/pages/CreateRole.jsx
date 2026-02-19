import {
  Box, Button, Checkbox, Flex, Heading, Input, Select,
  Table, Thead, Tbody, Tr, Th, Td, Alert, AlertIcon, AlertDescription,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function CreateRole() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [status, setStatus] = useState(1);
  const [modules, setModules] = useState({});
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [warnMsg, setWarnMsg] = useState("");

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      const res = await axios.get("/permissions");
      const grouped = {};
      res.data.forEach((p) => {
        const [module, action] = p.value.split("_");
        if (!grouped[module]) grouped[module] = new Set();
        grouped[module].add(action);
      });
      const finalModules = {};
      Object.keys(grouped).forEach((m) => (finalModules[m] = Array.from(grouped[m])));
      setModules(finalModules);
    } catch (err) {
      setErrorMsg("Failed to fetch permissions. Please try again.");
    }
  };

  const togglePerm = (module, action) => {
    const key = `${module}_${action}`;
    setPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const toggleAll = (module) => {
    const actions = ["read", "create", "update", "delete"];
    const modulePerms = actions.map((a) => `${module}_${a}`);
    const allSelected = modulePerms.every((p) => permissions.includes(p));
    setPermissions((prev) =>
      allSelected
        ? prev.filter((p) => !modulePerms.includes(p))
        : [...new Set([...prev, ...modulePerms])]
    );
  };

  const handleCreate = async () => {
    setErrorMsg(""); setSuccessMsg(""); setWarnMsg("");

    if (!name.trim()) {
      setWarnMsg("Role name is required.");
      return;
    }

    try {
      setLoading(true);
      await axios.post("/role/create", { name, status, permissions });
      setSuccessMsg("Role created successfully!");
      setTimeout(() => navigate("/admin/roles"), 1500);
    } catch (err) {
      setErrorMsg("Error creating role. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Heading size="md" mb={4}>Create Role</Heading>

      {/* ✅ Messages */}
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
      {warnMsg && (
        <Alert status="warning" borderRadius="md" mb={4}>
          <AlertIcon /><AlertDescription>{warnMsg}</AlertDescription>
        </Alert>
      )}

      <Box bg="white" p={6} borderRadius="md" mb={6} boxShadow="sm">
        <Flex gap={4}>
          <Box flex="1">
            <Heading size="xs" mb={1}>Name *</Heading>
            <Input placeholder="Enter role name" value={name}
              onChange={(e) => setName(e.target.value)} />
          </Box>
          <Box w="250px">
            <Heading size="xs" mb={1}>Status *</Heading>
            <Select value={status} onChange={(e) => setStatus(Number(e.target.value))}>
              <option value={1}>Active</option>
              <option value={0}>Inactive</option>
            </Select>
          </Box>
        </Flex>
      </Box>

      <Box bg="white" p={6} borderRadius="md" boxShadow="sm">
        <Table size="sm" variant="simple">
          <Thead bg="blue.300">
            <Tr>
              <Th color="white">PERMISSION</Th>
              <Th color="white">ALL</Th>
              <Th color="white">READ</Th>
              <Th color="white">CREATE</Th>
              <Th color="white">UPDATE</Th>
              <Th color="white">DELETE</Th>
            </Tr>
          </Thead>
          <Tbody>
            {Object.keys(modules).map((module) => (
              <Tr key={module}>
                <Td>{module}</Td>
                <Td>
                  <Checkbox
                    isChecked={["read", "create", "update", "delete"].every(
                      (a) => permissions.includes(`${module}_${a}`)
                    )}
                    onChange={() => toggleAll(module)}
                  />
                </Td>
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

        <Flex justify="flex-end" mt={6} gap={3}>
          <Button variant="outline" onClick={() => navigate("/admin/roles")}>Cancel</Button>
          <Button colorScheme="blue" onClick={handleCreate} isLoading={loading}>Create</Button>
        </Flex>
      </Box>
    </Box>
  );
}