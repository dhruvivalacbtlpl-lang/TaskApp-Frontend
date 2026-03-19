import { useEffect, useState, useRef } from "react";
import {
  Box, Heading, Text, HStack, VStack, Badge, Spinner, Center,
  Avatar, useColorModeValue, Input, InputGroup, InputLeftElement,
  IconButton, Button, useToast, Divider, Select, FormControl,
  FormLabel, SimpleGrid, Card, CardBody, Table, Thead, Tbody,
  Tr, Th, Td, TableContainer, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  AlertDialog, AlertDialogOverlay, AlertDialogContent,
  AlertDialogHeader, AlertDialogBody, AlertDialogFooter,
  Flex, Icon, Tooltip, Switch, NumberInput, NumberInputField, Checkbox,
  Tabs, TabList, TabPanels, Tab, TabPanel,
} from "@chakra-ui/react";
import {
  MdSearch, MdAdd, MdEdit, MdDelete, MdRefresh, MdBusiness,
  MdCreditCard, MdCheckCircle, MdCancel, MdDevices, MdExpandMore,
  MdExpandLess, MdPeople, MdFolder, MdCheckBox, MdBugReport,
  MdDescription, MdUploadFile, MdNotifications, MdSupportAgent,
  MdStar,
} from "react-icons/md";
import api from "../api";

const API_BASE = import.meta.env.VITE_API_TARGET || "http://localhost:5000";

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = (d) => d
  ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
  : "—";

const planColor = (name) => {
  if (name === "pro")   return "purple";
  if (name === "basic") return "blue";
  return "gray";
};

const statusColor = (s) => {
  if (s === "active")    return "green";
  if (s === "expired")   return "red";
  if (s === "cancelled") return "orange";
  return "gray";
};

const BILLING_CYCLES = [
  { value: "monthly",    label: "Monthly"  },
  { value: "quarterly",  label: "3 Months" },
  { value: "halfYearly", label: "6 Months" },
  { value: "yearly",     label: "Yearly"   },
];

const LIMIT_FIELDS = [
  { key: "staff",        label: "Staff Members"    },
  { key: "projects",     label: "Projects"         },
  { key: "teamMembers",  label: "Team Members"     },
  { key: "tasks",        label: "Tasks"            },
  { key: "issues",       label: "Issues"           },
  { key: "documents",    label: "Documents"        },
  { key: "taskStatuses", label: "Task Statuses"    },
  { key: "bulkUpload",   label: "Bulk Upload Rows" },
  { key: "devices",      label: "Devices"          },
];

const FEATURE_FIELDS = [
  { key: "notifications",    label: "Notifications"    },
  { key: "bulkUpload",       label: "Bulk Upload"      },
  { key: "prioritySupport",  label: "Priority Support" },
];

const PLAN_COLORS = [
  "#6b7280","#3b82f6","#8b5cf6","#10b981",
  "#f59e0b","#ef4444","#ec4899","#14b8a6",
];

// ═══════════════════════════════════════════════════════════════════════════════
// PLAN FORM MODAL — Create / Edit a plan
// ═══════════════════════════════════════════════════════════════════════════════
function PlanModal({ plan, onClose, onSaved }) {
  const toast   = useToast();
  const isEdit  = !!plan;
  const isBuiltIn = isEdit && ["free","basic","pro"].includes(plan.name);
  const [saving, setSaving] = useState(false);

  // All available features/limits pool
  const ALL_FEATURES = [
    { key: "staff",           label: "Staff Members",      type: "limit"   },
    { key: "projects",        label: "Projects",           type: "limit"   },
    { key: "teamMembers",     label: "Team Members",       type: "limit"   },
    { key: "tasks",           label: "Tasks",              type: "limit"   },
    { key: "issues",          label: "Issues",             type: "limit"   },
    { key: "documents",       label: "Documents",          type: "limit"   },
    { key: "taskStatuses",    label: "Task Statuses",      type: "limit"   },
    { key: "bulkUpload",      label: "Bulk Upload Rows",   type: "limit"   },
    { key: "devices",         label: "Devices",            type: "limit"   },
    { key: "notifications",   label: "Notifications",      type: "feature" },
    { key: "bulkUploadFlag",  label: "Bulk Upload Access", type: "feature" },
    { key: "prioritySupport", label: "Priority Support",   type: "feature" },
  ];

  // Basic plan info
  const [name,        setName]        = useState(plan?.name        || "");
  const [displayName, setDisplayName] = useState(plan?.displayName || "");
  const [description, setDescription] = useState(plan?.description || "");
  const [color,       setColor]       = useState(plan?.color       || "#8b5cf6");

  // Duration pricing — array of { cycle, price }
  const [durations, setDurations] = useState(() => {
    const cycles = ["monthly","quarterly","halfYearly","yearly"];
    return cycles
      .filter(c => plan?.pricing?.[c] !== undefined)
      .map(c => ({ cycle: c, price: plan?.pricing?.[c] ?? 0 }));
  });

  // Selected features — array of { key, label, type, value }
  // value = number for limit, boolean for feature
  const [selectedFeatures, setSelectedFeatures] = useState(() => {
    if (!plan) return [];
    const result = [];
    Object.entries(plan.limits || {}).forEach(([key, val]) => {
      const f = ALL_FEATURES.find(x => x.key === key && x.type === "limit");
      if (f) result.push({ ...f, value: val });
    });
    Object.entries(plan.features || {}).forEach(([key, val]) => {
      const fKey = key === "bulkUpload" ? "bulkUploadFlag" : key;
      const f = ALL_FEATURES.find(x => x.key === fKey && x.type === "feature");
      if (f) result.push({ ...f, value: val });
    });
    return result;
  });

  const [selectedDuration, setSelectedDuration] = useState("");
  const [selectedFeatureKey, setSelectedFeatureKey] = useState("");

  const inputBg = useColorModeValue("gray.50", "gray.700");
  const subText = useColorModeValue("gray.500", "gray.400");
  const border  = useColorModeValue("gray.200", "gray.600");
  const rowBg   = useColorModeValue("gray.50",  "gray.700");
  const cardBg  = useColorModeValue("white",    "gray.750");

  // Features not yet selected
  const availableFeatures = ALL_FEATURES.filter(
    f => !selectedFeatures.find(s => s.key === f.key)
  );

  // Durations not yet added
  const CYCLE_LABELS = {
    monthly: "Monthly", quarterly: "3 Months",
    halfYearly: "6 Months", yearly: "Yearly",
  };
  const availableDurations = Object.keys(CYCLE_LABELS).filter(
    c => !durations.find(d => d.cycle === c)
  );

  // Add duration
  const addDuration = () => {
    if (!selectedDuration) return;
    setDurations(p => [...p, { cycle: selectedDuration, price: 0 }]);
    setSelectedDuration("");
  };

  // Remove duration
  const removeDuration = (cycle) =>
    setDurations(p => p.filter(d => d.cycle !== cycle));

  // Update duration price
  const setDurationPrice = (cycle, price) =>
    setDurations(p => p.map(d => d.cycle === cycle ? { ...d, price: Number(price) } : d));

  // Add feature
  const addFeature = () => {
    if (!selectedFeatureKey) return;
    const f = ALL_FEATURES.find(x => x.key === selectedFeatureKey);
    if (!f) return;
    setSelectedFeatures(p => [...p, { ...f, value: f.type === "limit" ? 10 : false }]);
    setSelectedFeatureKey("");
  };

  // Remove feature — goes back to dropdown
  const removeFeature = (key) =>
    setSelectedFeatures(p => p.filter(f => f.key !== key));

  // Update feature value
  const setFeatureValue = (key, val) =>
    setSelectedFeatures(p => p.map(f => f.key === key ? { ...f, value: val } : f));

  const save = async () => {
    if (!name.trim() || !displayName.trim()) {
      toast({ title: "Plan Key and Display Name are required", status: "warning", duration: 3000 });
      return;
    }
    // Build pricing object
    const pricing = {};
    durations.forEach(d => { pricing[d.cycle] = d.price; });

    // Build limits + features objects
    const limits = {};
    const features = {};
    selectedFeatures.forEach(f => {
      if (f.type === "limit") {
        limits[f.key] = f.value;
      } else {
        const realKey = f.key === "bulkUploadFlag" ? "bulkUpload" : f.key;
        features[realKey] = f.value;
      }
    });

    setSaving(true);
    try {
      const payload = { name, displayName, description, color, pricing, limits, features };
      if (isEdit) {
        await api.put(`/subscription/plans/${plan._id}`, payload);
      } else {
        await api.post("/subscription/plans", payload);
      }
      toast({ title: isEdit ? "Plan updated!" : "Plan created!", status: "success", duration: 3000 });
      onSaved(); onClose();
    } catch (err) {
      toast({ title: err?.response?.data?.message || "Failed to save plan", status: "error", duration: 4000 });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} size="xl" scrollBehavior="inside">
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent borderRadius="2xl">
        <ModalHeader borderBottomWidth="1px" pb={4}>
          <HStack spacing={2}>
            <Box w={4} h={4} borderRadius="full" bg={color} />
            <Text>{isEdit ? `Edit — ${plan.displayName}` : "New Plan"}</Text>
            {isBuiltIn && <Badge colorScheme="orange" fontSize="xs">Built-in</Badge>}
          </HStack>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody py={5}>
          <VStack spacing={5} align="stretch">

            {/* ── Plan Name ── */}
            <SimpleGrid columns={2} spacing={4}>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Plan Key</FormLabel>
                <Input value={name}
                  onChange={e => setName(e.target.value)}
                  bg={inputBg} borderRadius="lg"
                  placeholder="e.g. enterprise"
                  isDisabled={isBuiltIn} />
                <Text fontSize="xs" color={subText} mt={1}>Lowercase, no spaces</Text>
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Display Name</FormLabel>
                <Input value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  bg={inputBg} borderRadius="lg"
                  placeholder="e.g. Enterprise" />
              </FormControl>
            </SimpleGrid>

            <FormControl>
              <FormLabel fontSize="sm">Description</FormLabel>
              <Input value={description}
                onChange={e => setDescription(e.target.value)}
                bg={inputBg} borderRadius="lg"
                placeholder="Short plan description" />
            </FormControl>

            {/* ── Color ── */}
            <FormControl>
              <FormLabel fontSize="sm">Plan Color</FormLabel>
              <HStack spacing={3} flexWrap="wrap">
                {["#6b7280","#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#ec4899","#14b8a6"].map(c => (
                  <Box key={c} w={7} h={7} borderRadius="full" bg={c} cursor="pointer"
                    border="3px solid"
                    borderColor={color === c ? "white" : "transparent"}
                    boxShadow={color === c ? `0 0 0 3px ${c}` : "none"}
                    onClick={() => setColor(c)} transition="0.15s" />
                ))}
                <Input type="color" value={color} w={8} h={8} p={0}
                  border="none" borderRadius="full" cursor="pointer"
                  onChange={e => setColor(e.target.value)} />
              </HStack>
            </FormControl>

            <Divider />

            {/* ── Duration ── */}
            <Box>
              <FormLabel fontSize="sm" fontWeight="700" mb={3}>
                Billing Durations & Prices
              </FormLabel>

              {/* Add duration */}
              <HStack mb={3}>
                <Select
                  placeholder="Add billing duration…"
                  value={selectedDuration}
                  onChange={e => setSelectedDuration(e.target.value)}
                  bg={inputBg} borderRadius="lg" size="sm" flex={1}
                >
                  {availableDurations.map(c => (
                    <option key={c} value={c}>{CYCLE_LABELS[c]}</option>
                  ))}
                </Select>
                <Button size="sm" colorScheme="purple" onClick={addDuration}
                  isDisabled={!selectedDuration} borderRadius="lg">
                  Add
                </Button>
              </HStack>

              {/* Duration rows */}
              <VStack spacing={2} align="stretch">
                {durations.map(d => (
                  <HStack key={d.cycle} p={3} bg={rowBg} borderRadius="xl"
                    border="1px solid" borderColor={border}>
                    <Badge colorScheme="purple" px={3} py={1} borderRadius="full"
                      fontSize="xs" fontWeight="700" w="100px" textAlign="center">
                      {CYCLE_LABELS[d.cycle]}
                    </Badge>
                    <HStack flex={1} spacing={1}>
                      <Text fontSize="sm" color={subText}>$</Text>
                      <Input
                        type="number" min={0} value={d.price}
                        onChange={e => setDurationPrice(d.cycle, e.target.value)}
                        bg={inputBg} borderRadius="lg" size="sm"
                      />
                    </HStack>
                    <IconButton size="xs" icon={<MdDelete size={13}/>}
                      colorScheme="red" variant="ghost" aria-label="Remove"
                      onClick={() => removeDuration(d.cycle)} />
                  </HStack>
                ))}
                {durations.length === 0 && (
                  <Text fontSize="xs" color={subText} textAlign="center" py={2}>
                    No durations added yet — add at least one above
                  </Text>
                )}
              </VStack>
            </Box>

            <Divider />

            {/* ── Features / Limits ── */}
            <Box>
              <FormLabel fontSize="sm" fontWeight="700" mb={3}>
                Features & Limits
              </FormLabel>

              {/* Add feature dropdown */}
              <HStack mb={3}>
                <Select
                  placeholder="Add a feature or limit…"
                  value={selectedFeatureKey}
                  onChange={e => setSelectedFeatureKey(e.target.value)}
                  bg={inputBg} borderRadius="lg" size="sm" flex={1}
                >
                  {availableFeatures.length === 0 ? (
                    <option disabled>All features added</option>
                  ) : (
                    availableFeatures.map(f => (
                      <option key={f.key} value={f.key}>
                        {f.label} ({f.type === "limit" ? "Limit" : "Feature"})
                      </option>
                    ))
                  )}
                </Select>
                <Button size="sm" colorScheme="purple" onClick={addFeature}
                  isDisabled={!selectedFeatureKey} borderRadius="lg">
                  Add
                </Button>
              </HStack>

              {/* Selected features as rows */}
              <VStack spacing={2} align="stretch">
                {selectedFeatures.map(f => (
                  <HStack key={f.key} p={3} bg={rowBg} borderRadius="xl"
                    border="1px solid" borderColor={border} spacing={3}>
                    <Text fontSize="sm" fontWeight="600" flex={1}>{f.label}</Text>

                    {f.type === "limit" ? (
                      // Limit — number input with -1/unlimited toggle
                      <HStack spacing={2}>
                        <Input
                          type="number" min={-1} value={f.value}
                          onChange={e => setFeatureValue(f.key, Number(e.target.value))}
                          bg={inputBg} borderRadius="lg" size="sm" w="80px"
                        />
                        <Badge
                          colorScheme={f.value === -1 ? "green" : f.value === 0 ? "red" : "blue"}
                          fontSize="9px" px={2} borderRadius="full" cursor="pointer"
                          onClick={() => setFeatureValue(f.key, f.value === -1 ? 10 : -1)}
                          title="Click to toggle unlimited"
                        >
                          {f.value === -1 ? "∞ Unlimited" : f.value === 0 ? "OFF" : f.value}
                        </Badge>
                      </HStack>
                    ) : (
                      // Feature flag — checkbox
                      <Checkbox
                        isChecked={!!f.value}
                        onChange={e => setFeatureValue(f.key, e.target.checked)}
                        colorScheme="purple"
                        size="lg"
                      >
                        <Text fontSize="xs" color={subText}>
                          {f.value ? "Enabled" : "Disabled"}
                        </Text>
                      </Checkbox>
                    )}

                    <IconButton size="xs" icon={<MdDelete size={13}/>}
                      colorScheme="red" variant="ghost" aria-label="Remove"
                      onClick={() => removeFeature(f.key)} />
                  </HStack>
                ))}
                {selectedFeatures.length === 0 && (
                  <Text fontSize="xs" color={subText} textAlign="center" py={2}>
                    No features added yet — pick from the dropdown above
                  </Text>
                )}
              </VStack>
            </Box>

          </VStack>
        </ModalBody>

        <ModalFooter borderTopWidth="1px" gap={3}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button colorScheme="purple" onClick={save} isLoading={saving}
            loadingText="Saving…" borderRadius="xl">
            {isEdit ? "Update Plan" : "Create Plan"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// PLAN CARD — shown in the Plans tab
// ═══════════════════════════════════════════════════════════════════════════════
function PlanCard({ plan, onEdit, onDelete, companyCount }) {
  const cardBg  = useColorModeValue("white",    "gray.800");
  const border  = useColorModeValue("gray.200", "gray.700");
  const subText = useColorModeValue("gray.500", "gray.400");
  const isBuiltIn = ["free","basic","pro"].includes(plan.name);

  return (
    <Card bg={cardBg} border="2px solid"
      borderColor={border}
      borderRadius="2xl" overflow="hidden"
      boxShadow="sm"
      _hover={{ boxShadow: "md", transform: "translateY(-2px)" }}
      transition="0.2s"
    >
      {/* Color bar */}
      <Box h={2} bg={plan.color || "#6b7280"} />

      <CardBody>
        <HStack justify="space-between" mb={3}>
          <HStack spacing={2}>
            <Box w={3} h={3} borderRadius="full" bg={plan.color || "#6b7280"} />
            <Text fontWeight="800" fontSize="lg">{plan.displayName}</Text>
            {isBuiltIn && (
              <Badge colorScheme="orange" fontSize="9px" borderRadius="full">Built-in</Badge>
            )}
          </HStack>
          <HStack spacing={1}>
            <IconButton size="xs" icon={<MdEdit size={13}/>} aria-label="Edit"
              colorScheme="blue" variant="ghost" onClick={() => onEdit(plan)} />
            {!isBuiltIn && (
              <IconButton size="xs" icon={<MdDelete size={13}/>} aria-label="Delete"
                colorScheme="red" variant="ghost" onClick={() => onDelete(plan)} />
            )}
          </HStack>
        </HStack>

        <Text fontSize="xs" color={subText} mb={3}>{plan.description}</Text>

        {/* Price */}
        <HStack mb={4}>
          <Text fontSize="2xl" fontWeight="900"
            color={plan.pricing?.monthly === 0 ? "green.500" : "blue.500"}>
            {plan.pricing?.monthly === 0 ? "Free" : `$${plan.pricing?.monthly}`}
          </Text>
          {plan.pricing?.monthly > 0 && (
            <Text fontSize="xs" color={subText}>/month</Text>
          )}
        </HStack>

        <Divider mb={3} />

        {/* Key limits */}
        <SimpleGrid columns={2} spacing={1} mb={3}>
          {[
            ["Staff",    plan.limits?.staff],
            ["Projects", plan.limits?.projects],
            ["Tasks",    plan.limits?.tasks],
            ["Devices",  plan.limits?.devices],
          ].map(([label, val]) => (
            <HStack key={label} spacing={1}>
              <Text fontSize="xs" color={subText}>{label}:</Text>
              <Text fontSize="xs" fontWeight="700"
                color={val === -1 ? "green.500" : val === 0 ? "red.400" : undefined}>
                {val === -1 ? "∞" : val === 0 ? "✕" : val}
              </Text>
            </HStack>
          ))}
        </SimpleGrid>

        {/* Features */}
        <HStack spacing={2} mb={3} flexWrap="wrap">
          {[
            { label: "Notif",   key: "notifications"   },
            { label: "Bulk",    key: "bulkUpload"       },
            { label: "Support", key: "prioritySupport"  },
          ].map(({ label, key }) => (
            <Badge key={key}
              colorScheme={plan.features?.[key] ? "green" : "gray"}
              fontSize="9px" borderRadius="full" px={2}>
              {plan.features?.[key] ? "✓" : "✕"} {label}
            </Badge>
          ))}
        </HStack>

        <Divider mb={2} />

        <HStack justify="space-between">
          <Text fontSize="xs" color={subText}>Companies on this plan</Text>
          <Badge colorScheme="blue" borderRadius="full" px={2}>{companyCount}</Badge>
        </HStack>
      </CardBody>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUBSCRIPTION ROW — expandable
// ═══════════════════════════════════════════════════════════════════════════════
function SubRow({ sub, onEdit, onDelete, rowHover, subText }) {
  const [open, setOpen]  = useState(false);
  const company   = sub.company;
  const daysLeft  = sub.endDate
    ? Math.max(0, Math.ceil((new Date(sub.endDate) - new Date()) / (1000*60*60*24)))
    : null;
  const isActive  = sub.status === "active";
  const isExpired = sub.status === "expired";
  const expandBg  = useColorModeValue("gray.50", "gray.850");
  const border    = useColorModeValue("gray.200","gray.600");

  const plan     = sub.plan;
  const limits   = plan?.limits   || {};
  const features = plan?.features || {};

  return (
    <>
      <Tr cursor="pointer" _hover={{ bg: rowHover }} transition="0.1s"
        onClick={() => setOpen(p => !p)}>

        <Td py={3}>
          <HStack spacing={2}>
            <Avatar size="xs" name={company?.name}
              src={company?.logo ? `${API_BASE}${company.logo}` : undefined}
              bg="blue.400" icon={<MdBusiness size={12}/>} />
            <VStack align="start" spacing={0}>
              <Text fontSize="sm" fontWeight="600" noOfLines={1} maxW="120px">
                {company?.name || "—"}
              </Text>
              <Text fontSize="10px" color={subText} noOfLines={1} maxW="120px">
                {company?.email || ""}
              </Text>
            </VStack>
          </HStack>
        </Td>

        <Td py={3}>
          <HStack spacing={1}>
            <Box w={2} h={2} borderRadius="full" bg={plan?.color || "gray"} />
            <Badge colorScheme={planColor(plan?.name)} borderRadius="full" px={2} fontSize="xs">
              {plan?.displayName || "—"}
            </Badge>
          </HStack>
        </Td>

        <Td py={3}>
          <Text fontSize="xs" color={subText} textTransform="capitalize">
            {sub.billingCycle || "—"}
          </Text>
        </Td>

        <Td py={3}>
          <Badge colorScheme={statusColor(sub.status)} borderRadius="full" px={2} fontSize="xs">
            {sub.status}
          </Badge>
        </Td>

        <Td py={3}>
          <VStack align="start" spacing={0}>
            <Text fontSize="xs"
              color={isExpired ? "red.500" : daysLeft !== null && daysLeft <= 7 ? "orange.500" : subText}>
              {fmt(sub.endDate)}
            </Text>
            {isActive && daysLeft !== null && (
              <Text fontSize="10px" fontWeight="700"
                color={daysLeft <= 7 ? "red.500" : "green.500"}>
                {daysLeft}d left
              </Text>
            )}
          </VStack>
        </Td>

        <Td py={3}>
          <Text fontSize="sm" fontWeight="700">${sub.amount || 0}</Text>
        </Td>

        <Td py={3} onClick={e => e.stopPropagation()}>
          <HStack spacing={1}>
            <Tooltip label={open ? "Hide details" : "View plan access"} hasArrow>
              <IconButton size="xs" variant="ghost" colorScheme="gray"
                icon={open ? <MdExpandLess size={16}/> : <MdExpandMore size={16}/>}
                aria-label="expand"
                onClick={e => { e.stopPropagation(); setOpen(p => !p); }} />
            </Tooltip>
            <IconButton size="xs" icon={<MdEdit size={13}/>}
              aria-label="Edit" colorScheme="blue" variant="ghost"
              onClick={() => onEdit(sub)} />
            <IconButton size="xs" icon={<MdDelete size={13}/>}
              aria-label="Delete" colorScheme="red" variant="ghost"
              onClick={() => onDelete(sub)} />
          </HStack>
        </Td>
      </Tr>

      {/* Expanded plan access details */}
      {open && (
        <Tr bg={expandBg}>
          <Td colSpan={7} py={3} px={5}>
            <Text fontSize="xs" fontWeight="700" color={subText}
              textTransform="uppercase" letterSpacing="wide" mb={3}>
              {plan?.displayName} Plan — Access Details
            </Text>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
              {/* Limits */}
              <Box>
                <Text fontSize="xs" fontWeight="700" color={subText} mb={2}
                  textTransform="uppercase" letterSpacing="widest">Limits</Text>
                <VStack align="stretch" spacing={1}>
                  {[
                    { icon: MdPeople,      label: "Staff",        key: "staff"        },
                    { icon: MdFolder,      label: "Projects",     key: "projects"     },
                    { icon: MdCheckBox,    label: "Tasks",         key: "tasks"        },
                    { icon: MdBugReport,   label: "Issues",        key: "issues"       },
                    { icon: MdDescription, label: "Documents",     key: "documents"    },
                    { icon: MdUploadFile,  label: "Bulk Upload",   key: "bulkUpload"   },
                    { icon: MdDevices,     label: "Devices",       key: "devices"      },
                  ].map(({ icon: Ic, label, key }) => {
                    const val = limits[key];
                    return (
                      <HStack key={key} justify="space-between">
                        <HStack spacing={1}>
                          <Icon as={Ic} boxSize={3} color={subText} />
                          <Text fontSize="xs" color={subText}>{label}</Text>
                        </HStack>
                        <Text fontSize="xs" fontWeight="700"
                          color={val === -1 ? "green.500" : val === 0 ? "red.400" : undefined}>
                          {val === -1 ? "Unlimited" : val === 0 ? "Not included" : val}
                        </Text>
                      </HStack>
                    );
                  })}
                </VStack>
              </Box>

              {/* Features */}
              <Box>
                <Text fontSize="xs" fontWeight="700" color={subText} mb={2}
                  textTransform="uppercase" letterSpacing="widest">Features</Text>
                <VStack align="stretch" spacing={2}>
                  {[
                    { icon: MdNotifications, label: "Notifications",   key: "notifications"   },
                    { icon: MdUploadFile,    label: "Bulk Upload",      key: "bulkUpload"      },
                    { icon: MdSupportAgent,  label: "Priority Support", key: "prioritySupport" },
                  ].map(({ icon: Ic, label, key }) => (
                    <HStack key={key} spacing={2}>
                      <Icon as={features[key] ? MdCheckCircle : MdCancel}
                        color={features[key] ? "green.400" : "gray.300"} boxSize={4} />
                      <Icon as={Ic} boxSize={3} color={subText} />
                      <Text fontSize="xs" color={features[key] ? undefined : subText}>{label}</Text>
                      <Badge ml="auto" colorScheme={features[key] ? "green" : "gray"}
                        fontSize="9px" borderRadius="full">
                        {features[key] ? "ON" : "OFF"}
                      </Badge>
                    </HStack>
                  ))}
                </VStack>
              </Box>

              {/* Pricing */}
              <Box>
                <Text fontSize="xs" fontWeight="700" color={subText} mb={2}
                  textTransform="uppercase" letterSpacing="widest">All Prices</Text>
                <VStack align="stretch" spacing={1}>
                  {BILLING_CYCLES.map(c => (
                    <HStack key={c.value} justify="space-between">
                      <Text fontSize="xs" color={subText}>{c.label}</Text>
                      <Text fontSize="xs" fontWeight="800"
                        color={!plan?.pricing?.[c.value] ? "green.500" : "blue.500"}>
                        {!plan?.pricing?.[c.value] ? "Free" : `$${plan.pricing[c.value]}`}
                      </Text>
                    </HStack>
                  ))}
                </VStack>
              </Box>
            </SimpleGrid>
          </Td>
        </Tr>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ASSIGN SUBSCRIPTION MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function AssignModal({ sub, companies, plans, onClose, onSaved }) {
  const toast  = useToast();
  const isEdit = !!sub;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    companyId:    sub?.company?._id || "",
    planId:       sub?.plan?._id    || "",
    billingCycle: sub?.billingCycle || "monthly",
    paymentNote:  sub?.paymentNote  || "Assigned by SuperAdmin",
  });

  const inputBg      = useColorModeValue("gray.50","gray.700");
  const subText      = useColorModeValue("gray.500","gray.400");
  const set          = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const selectedPlan = plans.find(p => p._id === form.planId);

  const save = async () => {
    if (!form.companyId || !form.planId) {
      toast({ title: "Company and Plan are required", status: "warning", duration: 3000 });
      return;
    }
    setSaving(true);
    try {
      await api.post("/subscription/assign", {
        companyId: form.companyId, planId: form.planId,
        billingCycle: form.billingCycle, paymentNote: form.paymentNote,
      });
      toast({ title: isEdit ? "Updated!" : "Created!", status: "success", duration: 3000 });
      onSaved(); onClose();
    } catch (err) {
      toast({ title: err?.response?.data?.message || "Failed", status: "error", duration: 4000 });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} size="lg">
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent borderRadius="2xl">
        <ModalHeader borderBottomWidth="1px" pb={4}>
          {isEdit ? "Edit Subscription" : "Assign Subscription"}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody py={5}>
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel fontSize="sm">Company</FormLabel>
              <Select value={form.companyId} onChange={set("companyId")}
                bg={inputBg} borderRadius="lg" isDisabled={isEdit}
                placeholder="Select company…">
                {companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </Select>
            </FormControl>
            <FormControl isRequired>
              <FormLabel fontSize="sm">Plan</FormLabel>
              <Select value={form.planId} onChange={set("planId")}
                bg={inputBg} borderRadius="lg" placeholder="Select plan…">
                {plans.map(p => (
                  <option key={p._id} value={p._id}>
                    {p.displayName} — ${p.pricing?.monthly}/mo
                  </option>
                ))}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm">Billing Cycle</FormLabel>
              <Select value={form.billingCycle} onChange={set("billingCycle")}
                bg={inputBg} borderRadius="lg">
                {BILLING_CYCLES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm">Payment Note</FormLabel>
              <Input value={form.paymentNote} onChange={set("paymentNote")}
                bg={inputBg} borderRadius="lg" />
            </FormControl>
            {selectedPlan && (
              <Box w="full" p={3} bg={useColorModeValue("blue.50","blue.900")}
                borderRadius="xl" border="1px solid"
                borderColor={useColorModeValue("blue.100","blue.700")}>
                <HStack justify="space-between">
                  <HStack>
                    <Box w={3} h={3} borderRadius="full" bg={selectedPlan.color} />
                    <Text fontSize="sm" fontWeight="700">{selectedPlan.displayName}</Text>
                  </HStack>
                  <Text fontSize="lg" fontWeight="900" color="blue.500">
                    ${selectedPlan.pricing?.[form.billingCycle] || 0}
                  </Text>
                </HStack>
              </Box>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter borderTopWidth="1px" gap={3}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button colorScheme="blue" onClick={save} isLoading={saving} borderRadius="xl">
            {isEdit ? "Update" : "Assign Plan"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function SuperAdminSubscriptions() {
  const [plans,        setPlans]        = useState([]);
  const [subs,         setSubs]         = useState([]);
  const [companies,    setCompanies]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [planFilter,   setPlanFilter]   = useState("");

  // modals
  const [creatingPlan,  setCreatingPlan]  = useState(false);
  const [editingPlan,   setEditingPlan]   = useState(null);
  const [deletingPlan,  setDeletingPlan]  = useState(null);
  const [creatingSub,   setCreatingSub]   = useState(false);
  const [editingSub,    setEditingSub]    = useState(null);
  const [deletingSub,   setDeletingSub]   = useState(null);

  const cancelRef = useRef();
  const toast     = useToast();

  const cardBg      = useColorModeValue("white",    "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const theadBg     = useColorModeValue("#bee3f8",  "#2a4365");
  const theadColor  = useColorModeValue("gray.700", "white");
  const rowHover    = useColorModeValue("#ebf8ff",  "#2d3748");
  const subText     = useColorModeValue("gray.500", "gray.400");
  const inputBg     = useColorModeValue("white",    "gray.700");
  const bg          = useColorModeValue("gray.50",  "gray.900");

  const load = async () => {
    setLoading(true);
    try {
      const t = Date.now(); // cache buster — bypasses server 30s cache
      const [planRes, subRes, compRes] = await Promise.all([
        api.get(`/subscription/plans?_t=${t}`),
        api.get(`/subscription/all?_t=${t}`),
        api.get(`/company/all?_t=${t}`),
      ]);
      setPlans(planRes.data    || []);
      setSubs(subRes.data      || []);
      setCompanies(compRes.data || []);
    } catch (err) {
      toast({ title: "Failed to load", status: "error", duration: 3000 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Auto-refresh every 30s so superadmin sees company self-purchases instantly
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const confirmDeletePlan = async () => {
    try {
      await api.delete(`/subscription/plans/${deletingPlan._id}`);
      toast({ title: "Plan deleted", status: "success", duration: 3000 });
      load();
    } catch (err) {
      toast({ title: err?.response?.data?.message || "Failed", status: "error", duration: 4000 });
    }
    setDeletingPlan(null);
  };

  const confirmDeleteSub = async () => {
    try {
      const freePlan = plans.find(p => p.name === "free");
      if (freePlan) {
        await api.post("/subscription/assign", {
          companyId:    deletingSub.company?._id,
          planId:       freePlan._id,
          billingCycle: "yearly",
          paymentNote:  "Reverted to Free by SuperAdmin",
        });
      }
      toast({ title: "Subscription removed — reverted to Free", status: "success", duration: 3000 });
      load();
    } catch {
      toast({ title: "Failed", status: "error", duration: 3000 });
    }
    setDeletingSub(null);
  };

  // plan → how many companies
  const planCompanyCount = (planId) =>
    subs.filter(s => (s.plan?._id || s.plan) === planId && s.status === "active").length;

  const filteredSubs = subs.filter(s => {
    const name = s.company?.name?.toLowerCase() || "";
    return (
      (!search       || name.includes(search.toLowerCase())) &&
      (!statusFilter || s.status === statusFilter) &&
      (!planFilter   || s.plan?.name === planFilter)
    );
  });

  const active  = subs.filter(s => s.status === "active").length;
  const expired = subs.filter(s => s.status === "expired").length;
  const revenue = subs.reduce((a, s) => a + (s.amount || 0), 0);

  if (loading) return <Center h="60vh"><Spinner size="xl" color="blue.500" /></Center>;

  return (
    <Box bg={bg} minH="100vh" p={{ base: 4, md: 6 }}>

      {/* Header */}
      <HStack justify="space-between" mb={6} wrap="wrap" gap={3}>
        <VStack align="start" spacing={0}>
          <Heading size="lg" fontWeight="900">Subscription Management</Heading>
          <Text color={subText} fontSize="sm">Manage plans and company subscriptions · SuperAdmin only</Text>
        </VStack>
        <IconButton icon={<MdRefresh />} variant="ghost" size="sm"
          aria-label="Refresh" onClick={load} borderRadius="lg" />
      </HStack>

      {/* Stats */}
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3} mb={6}>
        {[
          { label: "Total Plans",    value: plans.length,  color: "blue"   },
          { label: "Active Subs",    value: active,         color: "green"  },
          { label: "Expired",        value: expired,        color: "red"    },
          { label: "Total Revenue",  value: `$${revenue}`,  color: "teal"   },
        ].map(({ label, value, color }) => (
          <Card key={label} bg={cardBg} border="1px solid" borderColor={borderColor} borderRadius="xl">
            <CardBody py={3} px={4}>
              <Text fontSize="xl" fontWeight="900" color={`${color}.500`}>{value}</Text>
              <Text fontSize="10px" color={subText} textTransform="uppercase" fontWeight="700">{label}</Text>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>

      {/* ── TABS ─────────────────────────────────────────────────────────────── */}
      <Tabs variant="soft-rounded" colorScheme="blue">
        <TabList mb={5} gap={2}>
          <Tab>📦 Plans ({plans.length})</Tab>
          <Tab>💳 Subscriptions ({subs.length})</Tab>
        </TabList>

        <TabPanels>

          {/* ════ PLANS TAB ════ */}
          <TabPanel px={0}>
            <HStack justify="space-between" mb={5}>
              <Text fontWeight="700" color={subText} fontSize="sm">
                Create and manage subscription plans
              </Text>
              <Button leftIcon={<MdAdd />} colorScheme="blue" size="sm"
                borderRadius="lg" onClick={() => setCreatingPlan(true)}>
                New Plan
              </Button>
            </HStack>

            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={5}>
              {plans.map(plan => (
                <PlanCard
                  key={plan._id}
                  plan={plan}
                  onEdit={setEditingPlan}
                  onDelete={setDeletingPlan}
                  companyCount={planCompanyCount(plan._id)}
                />
              ))}
            </SimpleGrid>
          </TabPanel>

          {/* ════ SUBSCRIPTIONS TAB ════ */}
          <TabPanel px={0}>
            <HStack justify="space-between" mb={4} wrap="wrap" gap={3}>
              <Flex gap={3} wrap="wrap">
                <InputGroup maxW="220px">
                  <InputLeftElement><MdSearch color="gray" /></InputLeftElement>
                  <Input placeholder="Search company…" value={search}
                    onChange={e => setSearch(e.target.value)}
                    bg={inputBg} borderRadius="lg" />
                </InputGroup>
                <Select placeholder="All Statuses" value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  maxW="150px" borderRadius="lg" bg={inputBg}>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
                <Select placeholder="All Plans" value={planFilter}
                  onChange={e => setPlanFilter(e.target.value)}
                  maxW="140px" borderRadius="lg" bg={inputBg}>
                  {plans.map(p => (
                    <option key={p._id} value={p.name}>{p.displayName}</option>
                  ))}
                </Select>
              </Flex>
              <Button leftIcon={<MdAdd />} colorScheme="blue" size="sm"
                borderRadius="lg" onClick={() => setCreatingSub(true)}>
                Assign Subscription
              </Button>
            </HStack>

            <Text fontSize="xs" color={subText} mb={3}>
              💡 Click any row to expand and see full plan access details
            </Text>

            <Box bg={cardBg} borderRadius="2xl" border="1px solid"
              borderColor={borderColor} overflow="hidden">
              {filteredSubs.length === 0 ? (
                <Center py={12}>
                  <VStack>
                    <Text color={subText}>No subscriptions found</Text>
                    <Text fontSize="sm" color={subText}>Try adjusting filters or assign a new one</Text>
                  </VStack>
                </Center>
              ) : (
                <TableContainer>
                  <Table variant="simple" size="sm">
                    <Thead bg={theadBg}>
                      <Tr>
                        {["Company","Plan","Billing","Status","Expires","Amount","Actions"].map(h => (
                          <Th key={h} color={theadColor} py={3}>{h}</Th>
                        ))}
                      </Tr>
                    </Thead>
                    <Tbody>
                      {filteredSubs.map(sub => (
                        <SubRow
                          key={sub._id}
                          sub={sub}
                          onEdit={setEditingSub}
                          onDelete={setDeletingSub}
                          rowHover={rowHover}
                          subText={subText}
                        />
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* ── MODALS ─────────────────────────────────────────────────────────── */}
      {creatingPlan && (
        <PlanModal plan={null} onClose={() => setCreatingPlan(false)} onSaved={load} />
      )}
      {editingPlan && (
        <PlanModal plan={editingPlan} onClose={() => setEditingPlan(null)} onSaved={load} />
      )}
      {creatingSub && (
        <AssignModal sub={null} companies={companies} plans={plans}
          onClose={() => setCreatingSub(false)} onSaved={load} />
      )}
      {editingSub && (
        <AssignModal sub={editingSub} companies={companies} plans={plans}
          onClose={() => setEditingSub(null)} onSaved={load} />
      )}

      {/* Delete Plan confirm */}
      <AlertDialog isOpen={!!deletingPlan} leastDestructiveRef={cancelRef}
        onClose={() => setDeletingPlan(null)}>
        <AlertDialogOverlay>
          <AlertDialogContent borderRadius="2xl">
            <AlertDialogHeader fontWeight="bold">Delete Plan</AlertDialogHeader>
            <AlertDialogBody>
              Delete <strong>{deletingPlan?.displayName}</strong> plan permanently?
              Companies using this plan will need to be reassigned.
            </AlertDialogBody>
            <AlertDialogFooter gap={3}>
              <Button ref={cancelRef} onClick={() => setDeletingPlan(null)} variant="ghost">Cancel</Button>
              <Button colorScheme="red" onClick={confirmDeletePlan}>Delete Plan</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* Delete Subscription confirm */}
      <AlertDialog isOpen={!!deletingSub} leastDestructiveRef={cancelRef}
        onClose={() => setDeletingSub(null)}>
        <AlertDialogOverlay>
          <AlertDialogContent borderRadius="2xl">
            <AlertDialogHeader fontWeight="bold">Remove Subscription</AlertDialogHeader>
            <AlertDialogBody>
              Remove <strong>{deletingSub?.plan?.displayName}</strong> from{" "}
              <strong>{deletingSub?.company?.name}</strong>?
              They will be reverted to the Free plan.
            </AlertDialogBody>
            <AlertDialogFooter gap={3}>
              <Button ref={cancelRef} onClick={() => setDeletingSub(null)} variant="ghost">Cancel</Button>
              <Button colorScheme="red" onClick={confirmDeleteSub}>Remove Plan</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}