import { useEffect, useState } from "react";
import api from "../api";
import {
  Box, Heading, Text, Stack, Avatar, Button,
  Flex, Divider, Badge, Spinner, Alert, AlertIcon,
  Input, useToast,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { MdArrowBack, MdPerson, MdEmail, MdPhone, MdEdit, MdSave, MdClose } from "react-icons/md";
import { useAuth } from "../context/AuthContext";

function AdminProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", mobile: "" });
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const isAdmin = user?.role?.name?.toLowerCase() === "admin";

  useEffect(() => {
    api.get("/auth/profile")
      .then((res) => {
        setProfile(res.data);
        setFormData({
          name: res.data.name || "",
          email: res.data.email || "",
          mobile: res.data.mobile || "",
        });
      })
      .catch(() => setErrorMsg("Failed to load profile."))
      .finally(() => setLoading(false));
  }, []);

  const handleEdit = () => setIsEditing(true);

  const handleCancel = () => {
    setFormData({ name: profile.name || "", email: profile.email || "", mobile: profile.mobile || "" });
    setIsEditing(false);
  };

  const handleSave = () => {
    setSaving(true);
    api.put("/auth/profile", formData)
      .then((res) => {
        setProfile(res.data);
        setIsEditing(false);
        toast({ title: "Profile updated.", status: "success", duration: 3000, isClosable: true });
      })
      .catch(() => {
        toast({ title: "Failed to update profile.", status: "error", duration: 3000, isClosable: true });
      })
      .finally(() => setSaving(false));
  };

  if (loading) {
    return (
      <Flex justify="center" align="center" h="60vh">
        <Spinner size="xl" color="brand.500" />
      </Flex>
    );
  }

  return (
    <Box>
      {/* Back Button */}
      <Button
        mb={6} colorScheme="brand" variant="outline" size="sm"
        leftIcon={<MdArrowBack size={16} />}
        onClick={() => navigate("/admin")}
      >
        Back to Dashboard
      </Button>

      {errorMsg && (
        <Alert status="error" borderRadius="md" mb={4}>
          <AlertIcon />{errorMsg}
        </Alert>
      )}

      {/* Profile Card */}
      <Box bg="white" maxW="620px" mx="auto" p={8} borderRadius="lg" boxShadow="md" border="1px solid" borderColor="gray.200">
        <Flex align="center" justify="space-between" mb={6}>
          <Flex align="center">
            <Avatar size="xl" name={formData.name || profile?.name} mr={4} bg="brand.500" color="white" />
            <Box>
              <Heading size="md" color="gray.800">{formData.name || profile?.name}</Heading>
              <Badge colorScheme={isAdmin ? "brand" : "green"} fontSize="sm" mt={1}>
                {profile?.role?.name || "Staff"}
              </Badge>
            </Box>
          </Flex>

          {/* Edit / Save / Cancel Buttons */}
          {!isEditing ? (
            <Button
              leftIcon={<MdEdit size={16} />}
              colorScheme="brand" variant="outline" size="sm"
              onClick={handleEdit}
            >
              Edit
            </Button>
          ) : (
            <Flex gap={2}>
              <Button
                leftIcon={<MdSave size={16} />}
                colorScheme="brand" size="sm"
                isLoading={saving} loadingText="Saving"
                onClick={handleSave}
              >
                Save
              </Button>
              <Button
                leftIcon={<MdClose size={16} />}
                colorScheme="red" variant="outline" size="sm"
                onClick={handleCancel}
              >
                Cancel
              </Button>
            </Flex>
          )}
        </Flex>

        <Divider mb={6} />

        <Stack spacing={5}>
          {/* Full Name */}
          <Flex align="center" gap={3}>
            <Box bg="brand.50" p={2} borderRadius="md"><MdPerson size={20} color="#3b82f6" /></Box>
            <Box flex={1}>
              <Text fontSize="xs" color="gray.500" fontWeight="600">Full Name</Text>
              {isEditing ? (
                <Input
                  size="sm" mt={1} value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  borderColor="brand.300" focusBorderColor="brand.500"
                />
              ) : (
                <Text color="gray.800" fontWeight="500">{profile?.name || "—"}</Text>
              )}
            </Box>
          </Flex>

          {/* Email */}
          <Flex align="center" gap={3}>
            <Box bg="green.50" p={2} borderRadius="md"><MdEmail size={20} color="#10b981" /></Box>
            <Box flex={1}>
              <Text fontSize="xs" color="gray.500" fontWeight="600">Email</Text>
              {isEditing ? (
                <Input
                  size="sm" mt={1} type="email" value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  borderColor="green.300" focusBorderColor="green.500"
                />
              ) : (
                <Text color="gray.800" fontWeight="500">{profile?.email || "—"}</Text>
              )}
            </Box>
          </Flex>

          {/* Mobile */}
          <Flex align="center" gap={3}>
            <Box bg="purple.50" p={2} borderRadius="md"><MdPhone size={20} color="#8b5cf6" /></Box>
            <Box flex={1}>
              <Text fontSize="xs" color="gray.500" fontWeight="600">Mobile</Text>
              {isEditing ? (
                <Input
                  size="sm" mt={1} type="tel" value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  borderColor="purple.300" focusBorderColor="purple.500"
                />
              ) : (
                <Text color="gray.800" fontWeight="500">{profile?.mobile || "—"}</Text>
              )}
            </Box>
          </Flex>
        </Stack>
      </Box>
    </Box>
  );
}

export default AdminProfile;