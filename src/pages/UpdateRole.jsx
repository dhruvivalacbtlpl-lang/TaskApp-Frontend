import {
  Box,
  Button,
  Checkbox,
  Flex,
  Heading,
  Input,
  Select,
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

export default function UpdateRole() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [status, setStatus] = useState(1);
  const [modules, setModules] = useState({});
  const [permissions, setPermissions] = useState([]);

  useEffect(() => {
    fetchPermissions();
    fetchRole();
  }, [id]);

  /* ================= FETCH PERMISSIONS ================= */
  const fetchPermissions = async () => {
    const res = await axios.get("http://localhost:5000/api/permissions");

    // group permissions by module prefix exactly as in DB
    const grouped = {};
    res.data.forEach((p) => {
      const [module, action] = p.value.split("_");
      const moduleKey = module.toLowerCase(); // lowercase for consistent keys
      if (!grouped[moduleKey]) grouped[moduleKey] = new Set();
      grouped[moduleKey].add(action);
    });

    const finalModules = {};
    Object.keys(grouped).forEach(
      (m) => (finalModules[m] = Array.from(grouped[m]))
    );

    setModules(finalModules);
  };

  /* ================= FETCH ROLE ================= */
  const fetchRole = async () => {
    const res = await axios.get(`http://localhost:5000/api/role/${id}`);
    setName(res.data.name);
    setStatus(res.data.status);
    setPermissions(res.data.permissions || []);
  };

  /* ================= TOGGLE PERMISSION ================= */
  const togglePerm = (module, action) => {
    const key = `${module}_${action}`;
    const readKey = `${module}_read`;

    setPermissions((prev) => {
      let updated = [...prev];

      if (updated.includes(key)) {
        // ❌ uncheck
        updated = updated.filter((p) => p !== key);

        // if read is unchecked, remove create/update/delete
        if (action === "read") {
          ["create", "update", "delete"].forEach((a) => {
            const actionKey = `${module}_${a}`;
            updated = updated.filter((p) => p !== actionKey);
          });
        }
      } else {
        // ✅ check
        updated.push(key);

        // if create/update/delete is checked, auto add read
        if (action !== "read" && !updated.includes(readKey)) {
          updated.push(readKey);
        }
      }

      return updated;
    });
  };

  /* ================= TOGGLE ALL ================= */
  const toggleAll = (module) => {
    const actions = ["read", "create", "update", "delete"];
    const modulePerms = actions.map((a) => `${module}_${a}`);

    const allSelected = modulePerms.every((p) => permissions.includes(p));

    setPermissions((prev) => {
      let updated;
      if (allSelected) {
        // remove all
        updated = prev.filter((p) => !modulePerms.includes(p));
      } else {
        // add all
        updated = [...new Set([...prev, ...modulePerms])];

        // ensure read is included if any create/update/delete is selected
        if (!updated.includes(`${module}_read`)) {
          updated.push(`${module}_read`);
        }
      }
      return updated;
    });
  };

  /* ================= UPDATE ================= */
  const handleUpdate = async () => {
    try {
      console.log("Saving permissions:", permissions); // debug log
      await axios.put(`http://localhost:5000/api/role/${id}`, {
        name,
        status,
        permissions,
      });

      navigate("/admin/roles");
    } catch (err) {
      console.error("Error updating role:", err);
    }
  };

  /* ================= UI ================= */
  return (
    <Box>
      <Heading size="md" mb="4">
        Update Role
      </Heading>

      {/* ROLE INFO */}
      <Box bg="white" p="6" borderRadius="md" mb="6">
        <Flex gap="4">
          <Box flex="1">
            <Heading size="xs" mb="1">
              Name *
            </Heading>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Box>

          <Box w="250px">
            <Heading size="xs" mb="1">
              Status *
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

      {/* PERMISSION MATRIX */}
      <Box bg="white" p="6" borderRadius="md">
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>PERMISSION</Th>
              <Th>ALL</Th>
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

        <Flex justify="flex-end" mt="6" gap="3">
          <Button
            variant="outline"
            onClick={() => navigate("/admin/roles")}
          >
            Cancel
          </Button>

          <Button colorScheme="red" onClick={handleUpdate}>
            Update
          </Button>
        </Flex>
      </Box>
    </Box>
  );
}
