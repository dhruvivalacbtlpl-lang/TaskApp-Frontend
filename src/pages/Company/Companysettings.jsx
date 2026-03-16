import { useEffect, useState } from "react";
import {
  Box, Flex, Heading, Text, Button, VStack, HStack, Switch,
  Input, IconButton, Spinner, Alert, AlertIcon, AlertDescription,
  useColorModeValue, Badge, Divider, SimpleGrid, FormLabel,
} from "@chakra-ui/react";
import { MdAdd, MdDelete, MdSave, MdBusiness } from "react-icons/md";
import { useAuth } from "../../context/AuthContext";
import api from "../../api";

const DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
const DAY_LABELS = { monday:"Mon", tuesday:"Tue", wednesday:"Wed", thursday:"Thu", friday:"Fri", saturday:"Sat", sunday:"Sun" };

const defaultSchedule = () => DAYS.map(day => ({
  day,
  isWorking: !["saturday","sunday"].includes(day),
  startTime: "09:00",
  endTime:   "18:00",
  breaks:    day === "monday" ? [{ name:"Lunch", startTime:"13:00", endTime:"14:00" }] : [],
}));

export default function CompanySettings() {
  const { user, refreshProfile } = useAuth();
  const [company,       setCompany]       = useState(null);
  const [workingHours,  setWorkingHours]  = useState(defaultSchedule());
  const [holidays,       setHolidays]      = useState([]);
  const [newHoliday,    setNewHoliday]    = useState({ name:"", date:"" });
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [successMsg,    setSuccessMsg]    = useState("");
  const [errorMsg,      setErrorMsg]      = useState("");

  const cardBg    = useColorModeValue("white",   "gray.800");
  const textColor = useColorModeValue("gray.800","white");
  const subColor  = useColorModeValue("gray.500","gray.400");
  const borderClr = useColorModeValue("gray.200","gray.600");
  const inputBg   = useColorModeValue("white",   "gray.700");
  const dayBg     = useColorModeValue("gray.50", "gray.750");
  const activeBg  = useColorModeValue("green.50","green.900");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/auth/profile");
        const comp = res.data?.company;
        if (!comp) { setLoading(false); return; }
        setCompany(comp);
        if (comp.workingHours?.length) setWorkingHours(comp.workingHours);
        if (comp.holidays?.length)     setHolidays(comp.holidays);
      } catch {
        setErrorMsg("Failed to load company settings.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const updateDay = (dayIndex, field, value) => {
    setWorkingHours(prev => prev.map((d, i) => i === dayIndex ? { ...d, [field]: value } : d));
  };

  const addBreak = (dayIndex) => {
    setWorkingHours(prev => prev.map((d, i) =>
      i === dayIndex ? { ...d, breaks: [...(d.breaks || []), { name:"Break", startTime:"12:00", endTime:"13:00" }] } : d
    ));
  };

  const updateBreak = (dayIndex, breakIndex, field, value) => {
    setWorkingHours(prev => prev.map((d, i) =>
      i === dayIndex ? { ...d, breaks: d.breaks.map((b, bi) => bi === breakIndex ? { ...b, [field]: value } : b) } : d
    ));
  };

  const removeBreak = (dayIndex, breakIndex) => {
    setWorkingHours(prev => prev.map((d, i) =>
      i === dayIndex ? { ...d, breaks: d.breaks.filter((_, bi) => bi !== breakIndex) } : d
    ));
  };

  const addHoliday = () => {
    if (!newHoliday.name.trim() || !newHoliday.date) return;
    setHolidays(prev => [...prev, { ...newHoliday }]);
    setNewHoliday({ name:"", date:"" });
  };

  const removeHoliday = (index) => {
    setHolidays(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccessMsg(""); setErrorMsg("");
    try {
      const res = await api.put("/company/settings", { workingHours, holidays });
      await refreshProfile();
      if (res.data?.company) {
        setCompany(res.data.company);
        setWorkingHours(res.data.company.workingHours || []);
        setHolidays(res.data.company.holidays || []);
      }
      setSuccessMsg("Company settings saved successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Flex justify="center" py={20}><Spinner size="xl" color="brand.500"/></Flex>;

  const weeklyHours = workingHours
    .filter(d => d.isWorking)
    .reduce((sum, d) => {
      const start = d.startTime.split(":").map(Number);
      const end   = d.endTime.split(":").map(Number);
      let mins = (end[0]*60+end[1]) - (start[0]*60+start[1]);
      (d.breaks||[]).forEach(b => {
        const bs = b.startTime.split(":").map(Number);
        const be = b.endTime.split(":").map(Number);
        mins -= (be[0]*60+be[1]) - (bs[0]*60+bs[1]);
      });
      return sum + Math.max(0, mins);
    }, 0);

  return (
    <Box>
      {/* Header - Save button removed from top */}
      <Flex justify="space-between" align="center" mb={6}>
        <HStack spacing={3}>
          <Box bg="brand.100" p={3} borderRadius="lg" _dark={{ bg:"brand.900" }}>
            <MdBusiness size={24} color="#924485"/>
          </Box>
          <Box>
            <Heading size="md" color={textColor}>{company.name}</Heading>
            <Text fontSize="sm" color={subColor}>Company Working Hours & Holiday Settings</Text>
          </Box>
        </HStack>
      </Flex>

      {successMsg && <Alert status="success" borderRadius="md" mb={4}><AlertIcon/><AlertDescription>{successMsg}</AlertDescription></Alert>}
      {errorMsg   && <Alert status="error"   borderRadius="md" mb={4}><AlertIcon/><AlertDescription>{errorMsg}</AlertDescription></Alert>}

      {/* Summary Section */}
      <SimpleGrid columns={{ base:2, md:4 }} spacing={4} mb={6}>
        {[
          { label:"Working Days",   value:`${workingHours.filter(d=>d.isWorking).length} days/week`, color:"green" },
          { label:"Weekly Hours",   value:`${Math.floor(weeklyHours/60)}h ${weeklyHours%60}m`,      color:"blue"  },
          { label:"Holidays",       value:`${holidays.length} days`,                                 color:"orange"},
          { label:"Company",        value:company.name,                                              color:"purple"},
        ].map(s => (
          <Box key={s.label} bg={cardBg} p={4} borderRadius="xl" border="1px solid" borderColor={borderClr}>
            <Text fontSize="xs" color={subColor} mb={1}>{s.label}</Text>
            <Badge colorScheme={s.color} fontSize="sm" px={2} borderRadius="full" textTransform="uppercase">{s.value}</Badge>
          </Box>
        ))}
      </SimpleGrid>

      {/* Working Hours Editor */}
      <Box bg={cardBg} p={6} borderRadius="xl" border="1px solid" borderColor={borderClr} mb={6}>
        <Heading size="sm" color={textColor} mb={4}>🕐 Working Hours</Heading>
        <VStack spacing={3} align="stretch">
          {workingHours.map((day, dayIndex) => (
            <Box key={day.day} p={4} borderRadius="lg" bg={day.isWorking ? activeBg : dayBg} border="1px solid" borderColor={day.isWorking ? "green.200" : borderClr}>
              <Flex align="center" justify="space-between" mb={day.isWorking ? 3 : 0}>
                <HStack spacing={3}>
                  <Switch isChecked={day.isWorking} colorScheme="green" onChange={e => updateDay(dayIndex, "isWorking", e.target.checked)}/>
                  <Text fontWeight="600" fontSize="sm" color={textColor} w="40px">{DAY_LABELS[day.day]}</Text>
                  <Badge colorScheme={day.isWorking ? "green" : "gray"} fontSize="xs">{day.isWorking ? "Working" : "Off"}</Badge>
                </HStack>
                {day.isWorking && (
                  <HStack spacing={2}>
                    <Input size="sm" type="time" value={day.startTime} w="110px" bg={inputBg} onChange={e => updateDay(dayIndex, "startTime", e.target.value)}/>
                    <Text fontSize="xs" color={subColor}>to</Text>
                    <Input size="sm" type="time" value={day.endTime} w="110px" bg={inputBg} onChange={e => updateDay(dayIndex, "endTime", e.target.value)}/>
                    <Button size="xs" colorScheme="orange" variant="outline" leftIcon={<MdAdd size={12}/>} onClick={() => addBreak(dayIndex)}>Break</Button>
                  </HStack>
                )}
              </Flex>
              {day.isWorking && (day.breaks||[]).map((brk, bi) => (
                <Flex key={bi} align="center" gap={2} mt={2} pl={8}>
                  <Input size="xs" placeholder="Break Name" value={brk.name} w="90px" bg={inputBg} onChange={e => updateBreak(dayIndex, bi, "name", e.target.value)}/>
                  <Input size="xs" type="time" value={brk.startTime} w="100px" bg={inputBg} onChange={e => updateBreak(dayIndex, bi, "startTime", e.target.value)}/>
                  <Text fontSize="xs" color={subColor}>to</Text>
                  <Input size="xs" type="time" value={brk.endTime} w="100px" bg={inputBg} onChange={e => updateBreak(dayIndex, bi, "endTime", e.target.value)}/>
                  <IconButton size="xs" colorScheme="red" variant="ghost" icon={<MdDelete/>} onClick={() => removeBreak(dayIndex, bi)}/>
                </Flex>
              ))}
            </Box>
          ))}
        </VStack>
      </Box>

      {/* Holidays Editor */}
      <Box bg={cardBg} p={6} borderRadius="xl" border="1px solid" borderColor={borderClr}>
        <Heading size="sm" color={textColor} mb={4}>🏖️ Company Holidays</Heading>
        <Flex gap={3} mb={4} wrap="wrap">
          <Input placeholder="Holiday name" value={newHoliday.name} onChange={e => setNewHoliday(p => ({ ...p, name: e.target.value }))} w="220px" bg={inputBg}/>
          <Input type="date" value={newHoliday.date} onChange={e => setNewHoliday(p => ({ ...p, date: e.target.value }))} w="160px" bg={inputBg}/>
          <Button colorScheme="brand" leftIcon={<MdAdd/>} onClick={addHoliday} isDisabled={!newHoliday.name.trim() || !newHoliday.date}>Add Holiday</Button>
        </Flex>
        <Divider mb={4}/>
        <VStack spacing={2} align="stretch">
          {holidays.map((h, i) => (
            <Flex key={i} align="center" justify="space-between" p={3} bg={dayBg} borderRadius="lg" border="1px solid" borderColor={borderClr}>
              <HStack spacing={3}>
                <Text fontSize="lg">🏖️</Text>
                <Box>
                  <Text fontSize="sm" fontWeight="600">{h.name}</Text>
                  <Text fontSize="xs" color={subColor}>{new Date(h.date).toLocaleDateString()}</Text>
                </Box>
              </HStack>
              <IconButton size="sm" colorScheme="red" variant="ghost" icon={<MdDelete/>} onClick={() => removeHoliday(i)}/>
            </Flex>
          ))}
        </VStack>
      </Box>

      {/* Final Save Action */}
      <Flex justify="flex-end" mt={6}>
        <Button colorScheme="brand" size="lg" leftIcon={<MdSave/>} isLoading={saving} onClick={handleSave}>
          Save All Settings
        </Button>
      </Flex>
    </Box>
  );
}