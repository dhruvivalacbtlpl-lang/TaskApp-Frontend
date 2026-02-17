// src/pages/StaffPage.jsx
import {
  Box,
  Flex,
  Heading,
  Button,
  Badge,
  Spinner,
  HStack,
  Text,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

export default function StaffPage() {
  const navigate = useNavigate();
  const { hasPermission, user } = useAuth();
  const isAdmin = user?.role?.name?.toLowerCase() === "admin";

  const [staffs, setStaffs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [staffsPerPage] = useState(5);

  // Page protection
  useEffect(() => {
    if (!isAdmin && !hasPermission("Staff_read")) {
      navigate("/admin");
    }
  }, []);

  // Fetch staff
  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res = await axios.get("http://localhost:5000/api/staff");
      setStaffs(res.data || []);
    } catch (err) {
      console.error(err);
      setStaffs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  // Delete staff
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this staff?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/staff/${id}`);
      setStaffs(staffs.filter((s) => s._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  // Navigate to Edit Staff page
  const handleEdit = (staff) => {
    navigate(`/admin/staff/edit/${staff._id}`);
  };

  // Pagination logic
  const indexOfLastStaff = currentPage * staffsPerPage;
  const indexOfFirstStaff = indexOfLastStaff - staffsPerPage;
  const currentStaffs = staffs.slice(indexOfFirstStaff, indexOfLastStaff);
  const totalPages = Math.ceil(staffs.length / staffsPerPage);

  const handlePrev = () => currentPage > 1 && setCurrentPage(currentPage - 1);
  const handleNext = () => currentPage < totalPages && setCurrentPage(currentPage + 1);
  const handlePageClick = (page) => setCurrentPage(page);

  return (
    <Box bg="white" p={6} borderRadius="md" boxShadow="md">
      {/* HEADER */}
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="md">Staff</Heading>
        {(isAdmin || hasPermission("Staff_create")) && (
          <Button
            colorScheme="blue"
            onClick={() => navigate("/admin/staff/create")}
          >
            + Create Staff
          </Button>
        )}
      </Flex>

      {/* TABLE */}
      {loading ? (
        <Flex justify="center" py={10}>
          <Spinner size="lg" />
        </Flex>
      ) : (
        <>
          <Box overflowX="auto" borderRadius="md">
            <table style={styles.table}>
              <thead style={{ backgroundColor: "#1e40af", color: "white" }}>
                <tr>
                  <th style={styles.th}>#</th>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Phone</th>
                  <th style={styles.th}>Status</th>
                  <th style={{ ...styles.th, textAlign: "center" }}>Action</th>
                </tr>
              </thead>

              <tbody>
                {currentStaffs.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: 20 }}>
                      No staff available
                    </td>
                  </tr>
                ) : (
                  currentStaffs.map((staff, index) => (
                    <tr key={staff._id} style={styles.tr}>
                      <td style={styles.td}>
                        {(currentPage - 1) * staffsPerPage + index + 1}
                      </td>
                      <td style={styles.td}>{staff.name}</td>
                      <td style={styles.td}>{staff.email}</td>
                      <td style={styles.td}>{staff.mobile}</td>
                      <td style={styles.td}>
                        <Badge colorScheme="green" borderRadius="full" px={2} py={1}>
                          Active
                        </Badge>
                      </td>
                      <td style={{ ...styles.td, textAlign: "center" }}>
                        <HStack spacing={2} justify="center">
                          {(isAdmin || hasPermission("Staff_update")) && (
                            <Button
                              size="sm"
                              colorScheme="blue"
                              onClick={() => handleEdit(staff)}
                            >
                              ✏️
                            </Button>
                          )}
                          {(isAdmin || hasPermission("Staff_delete")) && (
                            <Button
                              size="sm"
                              colorScheme="red"
                              onClick={() => handleDelete(staff._id)}
                            >
                              🗑
                            </Button>
                          )}
                        </HStack>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Box>

          {/* PAGINATION */}
          {staffs.length > staffsPerPage && (
            <Flex justify="space-between" align="center" mt={4}>
              <Button onClick={handlePrev} disabled={currentPage === 1}>
                Prev
              </Button>

              <HStack>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    size="sm"
                    colorScheme={page === currentPage ? "blue" : "gray"}
                    onClick={() => handlePageClick(page)}
                  >
                    {page}
                  </Button>
                ))}
              </HStack>

              <Button onClick={handleNext} disabled={currentPage === totalPages}>
                Next
              </Button>
            </Flex>
          )}

          <Text mt={2} fontSize="sm" color="gray.600">
            Page {currentPage} of {totalPages} ({staffs.length} staff)
          </Text>
        </>
      )}
    </Box>
  );
}

const styles = {
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 14,
  },
  th: {
    padding: "10px 12px",
    textAlign: "left",
    textTransform: "uppercase",
    fontSize: 12,
    fontWeight: 600,
    color: "white",
  },
  td: { padding: "10px 12px", borderBottom: "1px solid #e5e7eb" },
  tr: { backgroundColor: "#fff" },
};
