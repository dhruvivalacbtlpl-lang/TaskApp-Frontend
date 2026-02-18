import {
  Box,
  Flex,
  Heading,
  Input,
  Select,
  Button,
  Checkbox,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

export default function UpdateRole() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();

  const [name, setName] = useState("");
  const [status, setStatus] = useState(1);
  const [modules, setModules] = useState({});
  const [permissions, setPermissions] = useState([]);

  useEffect(() => {
    fetchPermissions();
    fetchRole();
  }, [id]);

  // FETCH PERMISSIONS
  const fetchPermissions = async () => {
    const res = await axios.get("http://localhost:5000/api/permissions");

    const grouped = {};
    res.data.forEach((p) => {
      const [module, action] = p.value.split("_");
      const moduleKey = module.toLowerCase();

      if (!grouped[moduleKey]) grouped[moduleKey] = new Set();
      grouped[moduleKey].add(action);
    });

    const finalModules = {};
    Object.keys(grouped).forEach(
      (m) => (finalModules[m] = Array.from(grouped[m]))
    );

    setModules(finalModules);
  };

  // FETCH ROLE
  const fetchRole = async () => {
    const res = await axios.get(`http://localhost:5000/api/role/${id}`);
    setName(res.data.name);
    setStatus(res.data.status);
    setPermissions(res.data.permissions || []);
  };

  // TOGGLE PERMISSION
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

  // UPDATE ROLE
  const handleUpdate = async () => {
    try {
      await axios.put(`http://localhost:5000/api/role/${id}`, {
        name,
        status,
        permissions,
      });

      // 🔥 IMPORTANT — refresh logged-in user
      await refreshProfile();

      navigate("/admin/roles");
    } catch (err) {
      console.error("Update error:", err);
    }
  };

  return (
    <Box>
      <Heading size="md" mb="4">
        Update Role
      </Heading>

      <Box bg="white" p="6" borderRadius="md" mb="6">
        <Flex gap="4">
          <Box flex="1">
            <Heading size="xs" mb="1">
              Name
            </Heading>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Box>

          <Box w="200px">
            <Heading size="xs" mb="1">
              Status
            </Heading>
            <Select
              value={status}
              onChange={(e) => setStatus(Number(e.target.value))}
            >
              <option value={1}>Active</option>
              <option value={0}>Inactive</option>
            </Select>
          </Box>
        </Flex>
      </Box>

      <Box bg="white" p="6" borderRadius="md">
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>MODULE</Th>
              <Th>READ</Th>
              <Th>CREATE</Th>
              <Th>UPDATE</Th>
              <Th>DELETE</Th>
            </Tr>
          </Thead>
          <Tbody>
            {Object.keys(modules).map((module) => (
              <Tr key={module}>
                <Td>{module}</Td>

                {["read", "create", "update", "delete"].map((action) => (
                  <Td key={action}>
                    <Checkbox
                      isChecked={permissions.includes(
                        `${module}_${action}`
                      )}
                      onChange={() => togglePerm(module, action)}
                    />
                  </Td>
                ))}
              </Tr>
            ))}
          </Tbody>
        </Table>

        <Flex justify="flex-end" mt="6">
          <Button colorScheme="blue" onClick={handleUpdate}>
            Update Role
          </Button>
        </Flex>
      </Box>
    </Box>
  );
}
