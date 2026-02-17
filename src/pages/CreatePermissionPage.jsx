import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Heading,
  FormControl,
  FormLabel,
  Input,
  Select,
  Button,
  VStack,
} from "@chakra-ui/react";

export default function CreatePermissionPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const isEdit = Boolean(id);

  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [status, setStatus] = useState(1);

  /* ================= FETCH IF EDIT ================= */

  useEffect(() => {
    if (isEdit) {
      fetchPermission();
    }
  }, [id]);

  const fetchPermission = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/permissions/${id}`
      );

      setName(res.data.name);
      setValue(res.data.value);
      setStatus(res.data.status);
    } catch (err) {
      console.error(err);
    }
  };

  /* ================= SUBMIT ================= */

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (isEdit) {
        await axios.put(
          `http://localhost:5000/api/permissions/${id}`,
          {
            name,
            value,
            status,
          }
        );
      } else {
        await axios.post(
          "http://localhost:5000/api/permissions",
          {
            name,
            value,
            status,
          }
        );
      }

      navigate("/admin/permissions");
    } catch (err) {
      console.error(err);
    }
  };

  /* ================= UI ================= */

  return (
    <Box p={6} maxW="500px">
      <Heading size="lg" mb={6}>
        {isEdit ? "Edit Permission" : "Create Permission"}
      </Heading>

      <form onSubmit={handleSubmit}>
        <VStack spacing={4} align="stretch">

          {/* NAME */}
          <FormControl isRequired>
            <FormLabel>Name</FormLabel>
            <Input
              placeholder="Enter permission name (ex: Staff_read)"
              value={name}
              onChange={(e) => {
                const newName = e.target.value;
                setName(newName);

                // 🔥 AUTO GENERATE VALUE (fixes undefined bug)
                setValue(newName);
              }}
            />
          </FormControl>

          {/* VALUE */}
          <FormControl isRequired>
            <FormLabel>Value</FormLabel>
            <Input
              value={value}
              readOnly   // 🔥 Prevent manual change
            />
          </FormControl>

          {/* STATUS */}
          <FormControl>
            <FormLabel>Status</FormLabel>
            <Select
              value={status}
              onChange={(e) => setStatus(Number(e.target.value))}
            >
              <option value={1}>Active</option>
              <option value={0}>Inactive</option>
            </Select>
          </FormControl>

          {/* BUTTON */}
          <Button type="submit" colorScheme="blue">
            {isEdit ? "Update" : "Save"}
          </Button>

        </VStack>
      </form>
    </Box>
  );
}
