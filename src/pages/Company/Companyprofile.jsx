import { useEffect, useState, useRef } from "react";
import {
  Box, Flex, Heading, Text, VStack, HStack, SimpleGrid,
  Badge, Spinner, Alert, AlertIcon, useColorModeValue, 
  Avatar, Button, IconButton, Icon, useToast, Divider, 
  List, ListItem, Spacer
} from "@chakra-ui/react";
import {
  MdLocationOn, MdPhone, MdLink, MdCalendarToday, 
  MdAccessTime, MdEdit, MdCameraAlt, MdVerified
} from "react-icons/md";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../../api";

export default function CompanyProfile() {
  const { user } = useAuth(); // Primary source of truth
  const navigate = useNavigate();
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  const cardBg = useColorModeValue("white", "gray.800");
  const textColor = useColorModeValue("gray.800", "white");
  const subColor = useColorModeValue("gray.500", "gray.400");
  const borderClr = useColorModeValue("gray.100", "gray.700");

  // Sync state with AuthContext whenever user data changes
  useEffect(() => {
    if (user?.company) {
      setCompany(user.company);
      setLoading(false);
    } else if (user) {
      // If user is loaded but no company object is attached yet
      setLoading(false);
    }
  }, [user]);

  // --- GOOGLE-STYLE GROUPING LOGIC ---
  const getGroupedHours = () => {
    if (!company?.workingHours || company.workingHours.length === 0) return [];

    const dayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    
    const sortedHours = [...company.workingHours].sort(
      (a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day)
    );

    const groups = [];
    let startDay = sortedHours[0];
    let lastDay = sortedHours[0];

    const getTimeStr = (day) => day.isWorking ? `${day.startTime} – ${day.endTime}` : "Closed";

    for (let i = 1; i <= sortedHours.length; i++) {
      const currentDay = sortedHours[i];
      const prevTime = getTimeStr(lastDay);
      const currentTime = currentDay ? getTimeStr(currentDay) : null;

      if (currentTime === prevTime && i < sortedHours.length) {
        lastDay = currentDay;
      } else {
        const startLabel = startDay.day.charAt(0).toUpperCase() + startDay.day.slice(1, 3);
        const endLabel = lastDay.day.charAt(0).toUpperCase() + lastDay.day.slice(1, 3);
        
        const groupLabel = startDay.day === lastDay.day 
          ? startDay.day.charAt(0).toUpperCase() + startDay.day.slice(1)
          : `${startLabel} – ${endLabel}`;
        
        groups.push({ label: groupLabel, time: prevTime });
        
        if (currentDay) {
          startDay = currentDay;
          lastDay = currentDay;
        }
      }
    }
    return groups;
  };

  const handleLogoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("logo", file);
    try {
      const res = await api.put("/company/logo", formData, { headers: { "Content-Type": "multipart/form-data" } });
      // Important: Use toast and consider calling refreshProfile() if logo is stored in Auth
      setCompany(prev => ({ ...prev, logo: res.data.logo }));
      toast({ title: "Logo updated!", status: "success", position: "top-right" });
    } catch {
      toast({ title: "Upload failed", status: "error", position: "top-right" });
    }
  };

  if (loading) return <Flex justify="center" align="center" minH="60vh"><Spinner size="xl" thickness="4px" color="purple.500" /></Flex>;
  if (!company) return <Box p={10}><Alert status="error"><AlertIcon />No Company Data Found</Alert></Box>;

  return (
    <Box maxW="1000px" mx="auto" pb={10} p={{ base: 4, md: 8 }}>
      
      {/* Header Section */}
      <Box bgGradient="linear(to-r, purple.600, blue.600)" h="160px" borderRadius="2xl" position="relative" mb="80px" boxShadow="lg">
        <Flex position="absolute" bottom="-40px" left={{ base: "50%", md: "40px" }} transform={{ base: "translateX(-50%)", md: "none" }} direction={{ base: "column", md: "row" }} align="flex-end" gap={6} w={{ base: "full", md: "auto" }} px={{ base: 4, md: 0 }}>
          <Box position="relative">
            <Avatar 
              size="2xl" 
              src={company?.logo ? `http://localhost:5000${company.logo}` : ""} 
              name={company?.name} 
              p={1} bg="white" boxShadow="xl" border="4px solid" borderColor={cardBg} 
            />
            <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleLogoChange} />
            <IconButton icon={<MdCameraAlt />} position="absolute" bottom="5px" right="5px" colorScheme="purple" rounded="full" size="sm" onClick={() => fileInputRef.current.click()} />
          </Box>
          <Box pb={2} textAlign={{ base: "center", md: "left" }}>
            <HStack justify={{ base: "center", md: "start" }} spacing={2}>
              <Heading size="lg" color={textColor}>{company?.name}</Heading>
              <Icon as={MdVerified} color="blue.400" />
            </HStack>
            <Text color={subColor} fontSize="sm" fontWeight="500">{company?.email}</Text>
          </Box>
        </Flex>
        {user?.isOwner && (
          <Button 
            position="absolute" top="4" right="4" 
            leftIcon={<MdEdit />} size="sm" colorScheme="whiteAlpha" backdropFilter="blur(10px)"
            onClick={() => navigate("/admin/company-settings")}
          >
            Edit Settings
          </Button>
        )}
      </Box>

      {/* Content Grid */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
        
        {/* Left Card: Info */}
        <VStack align="stretch" spacing={6} bg={cardBg} p={8} borderRadius="2xl" border="1px solid" borderColor={borderClr} boxShadow="sm">
          <Heading size="xs" color="purple.500" textTransform="uppercase" letterSpacing="widest">Contact Information</Heading>
          <VStack align="stretch" spacing={5}>
            <HStack spacing={4}>
              <Icon as={MdLocationOn} color="purple.400" fontSize="20px"/>
              <Box><Text fontSize="xs" color={subColor}>Address</Text><Text fontSize="sm" fontWeight="600">{company?.address || "Not specified"}</Text></Box>
            </HStack>
            <HStack spacing={4}>
              <Icon as={MdPhone} color="purple.400" fontSize="20px"/>
              <Box><Text fontSize="xs" color={subColor}>Phone</Text><Text fontSize="sm" fontWeight="600">{company?.phone || "Not specified"}</Text></Box>
            </HStack>
            <HStack spacing={4}>
              <Icon as={MdLink} color="purple.400" fontSize="20px"/>
              <Box><Text fontSize="xs" color={subColor}>Website</Text><Text fontSize="sm" fontWeight="600" color="blue.500">{company?.website || "None"}</Text></Box>
            </HStack>
          </VStack>
        </VStack>

        {/* Right Card: Google-Style Schedule */}
        <VStack align="stretch" spacing={6} bg={cardBg} p={8} borderRadius="2xl" border="1px solid" borderColor={borderClr} boxShadow="sm">
          <Flex justify="space-between" align="center">
            <Heading size="xs" color="purple.500" textTransform="uppercase" letterSpacing="widest">Business Hours</Heading>
            <Badge colorScheme="green" variant="subtle" rounded="full" px={3}>Active</Badge>
          </Flex>
          
          <List spacing={0}>
            {getGroupedHours().map((group, index) => (
              <Box key={index}>
                <Flex justify="space-between" py={3} align="center">
                  <Text fontWeight="700" fontSize="sm" color={textColor}>{group.label}</Text>
                  <Text fontSize="sm" color={group.time === "Closed" ? "red.400" : "gray.600"} fontWeight="500">
                    {group.time}
                  </Text>
                </Flex>
                {index < getGroupedHours().length - 1 && <Divider borderColor={borderClr} />}
              </Box>
            ))}
          </List>
        </VStack>
      </SimpleGrid>
    </Box>
  );
}