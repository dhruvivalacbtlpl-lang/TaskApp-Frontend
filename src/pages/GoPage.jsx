// src/pages/GoPage.jsx
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Flex, Spinner, Text } from "@chakra-ui/react";
import { useAuth } from "../context/AuthContext";

export default function GoPage() {
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();

  useEffect(() => {
    console.log("🚀 GoPage loaded");
    console.log("🔍 loading:", loading);
    console.log("🔍 user:", user);
    console.log("🔍 full URL:", window.location.href);
    console.log("🔍 searchParams p:", searchParams.get("p"));
    console.log("🔍 searchParams requestId:", searchParams.get("requestId"));

    if (loading) return;

    const p         = searchParams.get("p");
    const requestId = searchParams.get("requestId");
    const token     = searchParams.get("token");
    const docId     = searchParams.get("docId");

    let dest = "/admin";
    if (p === "documents") {
      if (requestId) dest = `/admin/documents?requestId=${requestId}`;
      else if (token && docId) dest = `/admin/documents?token=${token}&docId=${docId}`;
      else dest = "/admin/documents";
    }

    console.log("🎯 dest:", dest);
    console.log("🎯 user logged in:", !!user);

    if (user) {
      console.log("✅ Already logged in, going to:", dest);
      window.location.href = dest;
    } else {
      const loginUrl = `/?redirect=${encodeURIComponent(dest)}`;
      console.log("🔐 Not logged in, going to login:", loginUrl);
      window.location.href = loginUrl;
    }
  }, [loading, user]);

  return (
    <Flex minH="100vh" align="center" justify="center" direction="column" gap={4}>
      <Spinner size="xl" color="blue.500" />
      <Text color="gray.500" fontSize="sm">Redirecting...</Text>
    </Flex>
  );
}