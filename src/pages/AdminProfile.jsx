import { useEffect, useState } from "react";
import api from "../api";
import {
  Box, Heading, Text, Stack, Avatar, Button,
  Flex, Divider, Badge, Spinner, Alert, AlertIcon,
  Input, useToast, useColorModeValue,
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

  const textColor    = useColorModeValue("gray.800", "white");
  const subColor     = useColorModeValue("gray.500", "gray.400");
  const dividerColor = useColorModeValue("gray.200", "gray.500");

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
      <Button
        mb={6} size="sm"
        leftIcon={<MdArrowBack size={16} />}
        onClick={() => navigate("/admin")}
        style={{
          background: "rgba(124,58,237,0.2)",
          color: "#c4b5fd",
          border: "1px solid rgba(124,58,237,0.5)",
        }}
        _hover={{ background: "rgba(124,58,237,0.4) !important" }}
      >
        Back to Dashboard
      </Button>

      {errorMsg && (
        <Alert status="error" borderRadius="md" mb={4}>
          <AlertIcon />{errorMsg}
        </Alert>
      )}

      {/* ── Profile Card — inline styles so no theme interference ── */}
      <Box
        maxW="620px"
        mx="auto"
        p={8}
        borderRadius="xl"
        style={{
          background: "linear-gradient(135deg, #2d1f5e 0%, #1a1a2e 100%)",
          border: "1px solid rgba(124,58,237,0.5)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}
      >
        {/* Header */}
        <Flex align="center" justify="space-between" mb={6} gap={4} flexWrap="wrap">
          <Flex align="center" gap={4}>
            <Avatar size="xl" name={formData.name || profile?.name} bg="brand.500" color="white" />
            <Box>
              <Heading size="md" color="white">{formData.name || profile?.name}</Heading>
              <Badge
                mt={1} px={3} py={1} borderRadius="full" fontSize="xs"
                style={{ background: "rgba(124,58,237,0.3)", color: "#c4b5fd", border: "1px solid rgba(124,58,237,0.5)" }}
              >
                {profile?.role?.name || "Staff"}
              </Badge>
            </Box>
          </Flex>

          {!isEditing ? (
            <Button
              leftIcon={<MdEdit size={16} />}
              size="sm"
              style={{ background: "rgba(124,58,237,0.8)", color: "white", border: "1px solid rgba(124,58,237,1)", minWidth: "90px" }}
              _hover={{ background: "#7c3aed !important" }}
              onClick={handleEdit}
            >
              Edit
            </Button>
          ) : (
            <Flex gap={2} flexWrap="wrap">
              <Button
                leftIcon={<MdSave size={16} />}
                colorScheme="brand" size="sm"
                isLoading={saving} loadingText="Saving"
                onClick={handleSave} minW="80px"
              >
                Save
              </Button>
              <Button
                leftIcon={<MdClose size={16} />}
                colorScheme="red" variant="outline" size="sm"
                onClick={handleCancel} minW="90px"
              >
                Cancel
              </Button>
            </Flex>
          )}
        </Flex>

        <Divider borderColor={dividerColor} mb={6} />

        <Stack spacing={6}>
          {/* Full Name */}
          <Flex align="center" gap={4}>
            <Box p={2.5} borderRadius="lg" flexShrink={0}
              style={{ background: "rgba(124,58,237,0.25)", border: "1px solid rgba(124,58,237,0.3)" }}>
              <MdPerson size={22} color="#c4b5fd" />
            </Box>
            <Box flex={1}>
              <Text fontSize="xs" color="purple.300" fontWeight="700" textTransform="uppercase" letterSpacing="wider">Full Name</Text>
              {isEditing ? (
                <Input size="sm" mt={1} value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  borderColor="purple.500" focusBorderColor="purple.300" color="white" />
              ) : (
                <Text color="white" fontWeight="500" fontSize="md">{profile?.name || "—"}</Text>
              )}
            </Box>
          </Flex>

          {/* Email */}
          <Flex align="center" gap={4}>
            <Box p={2.5} borderRadius="lg" flexShrink={0}
              style={{ background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.3)" }}>
              <MdEmail size={22} color="#6ee7b7" />
            </Box>
            <Box flex={1}>
              <Text fontSize="xs" color="green.300" fontWeight="700" textTransform="uppercase" letterSpacing="wider">Email</Text>
              {isEditing ? (
                <Input size="sm" mt={1} type="email" value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  borderColor="green.500" focusBorderColor="green.300" color="white" />
              ) : (
                <Text color="white" fontWeight="500" fontSize="md">{profile?.email || "—"}</Text>
              )}
            </Box>
          </Flex>

          {/* Mobile */}
          <Flex align="center" gap={4}>
            <Box p={2.5} borderRadius="lg" flexShrink={0}
              style={{ background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.3)" }}>
              <MdPhone size={22} color="#c4b5fd" />
            </Box>
            <Box flex={1}>
              <Text fontSize="xs" color="purple.300" fontWeight="700" textTransform="uppercase" letterSpacing="wider">Mobile</Text>
              {isEditing ? (
                <Input size="sm" mt={1} type="tel" value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  borderColor="purple.500" focusBorderColor="purple.300" color="white" />
              ) : (
                <Text color="white" fontWeight="500" fontSize="md">{profile?.mobile || "—"}</Text>
              )}
            </Box>
          </Flex>
        </Stack>
      </Box>
    </Box>
  );
}

export default AdminProfile;