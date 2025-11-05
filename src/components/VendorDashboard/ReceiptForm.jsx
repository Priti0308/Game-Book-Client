import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import "dayjs/locale/mr"; // Import Marathi locale
import {
  FaEdit,
  FaTrashAlt,
  FaPrint,
  FaPlus,
  FaMinus,
  FaShareAlt,
} from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";
import { toJpeg } from "html-to-image";

dayjs.extend(customParseFormat);
dayjs.locale("mr");

const API_BASE_URI = "https://game-book.onrender.com";

const COMPANY_NAMES = [
  "कल्याण",
  "मेन बाजार",
  "श्रीदेवी",
  "श्रीदेवी नाईट",
  "मिलन डे",
  "मिलन नाईट",
];

const evaluateExpression = (expression) => {
  if (typeof expression !== "string" || !expression.trim()) {
    return 0;
  }
  try {
    let sanitized = expression.replace(/[^0-9+\-*/.]/g, "");
    sanitized = sanitized.replace(/[+\-*/.]+$/, "");
    if (!sanitized) return 0;
    // eslint-disable-next-line no-eval
    const result = eval(sanitized);
    return isFinite(result) ? result : 0;
  } catch (error) {
    return 0;
  }
};

const getMarathiDay = (englishDay) => {
  const dayMap = {
    Sunday: "रविवार",
    Monday: "सोमवार",
    Tuesday: "मंगळवार",
    Wednesday: "बुधवार",
    Thursday: "गुरुवार",
    Friday: "शुक्रवार",
    Saturday: "शनिवार",
  };
  return dayMap[englishDay] || englishDay;
};

// --- UPDATED: Now accepts customerCompany to preserve it on clear ---
const getInitialFormData = (businessName, customerCompany = "") => {
  const currentDayInEnglish = dayjs().format("dddd");
  return {
    _id: null,
    businessName: businessName || "Bappa Gaming",
    customerId: "",
    customerName: "",
    customerCompany: customerCompany, // Use the passed-in value
    day: getMarathiDay(currentDayInEnglish),
    date: dayjs().format("DD-MM-YYYY"),
    payment: "",
    pendingAmount: "",
    advanceAmount: "",
    cuttingAmount: "",
    jama: "",
    chuk: "",
    isChukEnabled: false, // For NA/LD checkbox
    chukPercentage: "10", // ADDED for LD calculation
    deductionRate: "10", // Default to 10%
  };
};

// --- UPDATED: 'pan' field now includes 'type' ---
const getInitialGameRows = () => [
  {
    id: 1,
    type: "आ.",
    income: "",
    o: "",
    jod: "",
    ko: "",
    pan: { val1: "", val2: "", type: "sd" }, // MODIFIED
    gun: { val1: "", val2: "" },
    special: { type: "jackpot", val1: "", val2: "" }, // NEW
    multiplier: 8,
  },
  {
    id: 2,
    type: "कु.",
    income: "",
    o: "",
    jod: "",
    ko: "",
    pan: { val1: "", val2: "", type: "sd" }, // MODIFIED
    gun: { val1: "", val2: "" },
    special: { type: "jackpot", val1: "", val2: "" }, // NEW
    multiplier: 9,
  },
];

const initialOpenCloseValues = {
  open: "",
  close: "",
  jod: "",
};

const ReceiptForm = ({ businessName = "Bappa Gaming" }) => {
  const [formData, setFormData] = useState(() =>
    getInitialFormData(businessName)
  );
  const [gameRows, setGameRows] = useState(getInitialGameRows());
  const [openCloseValues, setOpenCloseValues] = useState(
    initialOpenCloseValues
  );
  const [customerList, setCustomerList] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  // --- NEW: State for company filter ---
  const [companySearchTerm, setCompanySearchTerm] = useState("");
  const [serialNumberInput, setSerialNumberInput] = useState("");
  const [isSharing, setIsSharing] = useState(false);

  // --- State for global 'special' type ---
  const [globalSpecialType, setGlobalSpecialType] = useState("jackpot");

  // --- NEW: State for header dropdown visibility ---
  const [isSpecialDropdownOpen, setIsSpecialDropdownOpen] = useState(false);

  // --- STATES FOR SEARCHABLE DROPDOWN ---
  const [customerSearch, setCustomerSearch] = useState("");
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const customerSearchRef = useRef(null);

  // --- NEW: Ref for header dropdown ---
  const specialHeaderRef = useRef(null);

  const printRef = useRef();
  const token = localStorage.getItem("token");
  const formRef = useRef(null);
  const isEditingRef = useRef(false);

  // --- NEW: Ref to track previous serial number to prevent re-runs ---
  const prevSerialNumberRef = useRef();

  // --- UPDATED: Clear button now preserves company name ---
  const clearForm = useCallback(() => {
    setFormData((prevFormData) =>
      // Pass the current businessName and customerCompany to preserve them
      getInitialFormData(prevFormData.businessName, prevFormData.customerCompany)
    );
    setGameRows(getInitialGameRows());
    setSerialNumberInput("");
    setCustomerSearch("");
    setIsCustomerDropdownOpen(false);
    setGlobalSpecialType("jackpot"); // Reset global type
    setIsSpecialDropdownOpen(false); // NEW: Close header dropdown
    isEditingRef.current = false;
    // openCloseValues is intentionally not cleared
  }, []); // No dependencies needed as setFormData provides the previous state

  const fetchCustomers = useCallback(async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API_BASE_URI}/api/customers`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const sortedCustomers = (response.data.customers || []).sort(
        (a, b) => a.srNo - b.srNo
      );

      const sequentialCustomers = sortedCustomers.map((customer, index) => ({
        ...customer,
        srNo: index + 1,
      }));

      setCustomerList(sequentialCustomers);
    } catch (error) {
      toast.error("Failed to fetch customer data.");
    }
  }, [token]);

  const fetchLatestOpenCloseValues = useCallback((allReceipts) => {
    const todayStr = dayjs().format("YYYY-MM-DD");
    const receiptsFromToday = allReceipts.filter(
      (r) => dayjs(r.date).format("YYYY-MM-DD") === todayStr
    );

    let lastOpenClose = initialOpenCloseValues;
    if (receiptsFromToday.length > 0) {
      receiptsFromToday.sort((a, b) => {
        const dateA = dayjs(a.date);
        const dateB = dayjs(b.date);
        const dateDiff = dateB.diff(dateA);
        if (dateDiff !== 0) return dateDiff;
        if (b._id > a._id) return 1;
        if (a._id < b._id) return -1;
        return 0;
      });
      const latestReceiptOfTheDay = receiptsFromToday[0];

      if (latestReceiptOfTheDay.openCloseValues) {
        lastOpenClose = {
          open: latestReceiptOfTheDay.openCloseValues.open || "",
          close: latestReceiptOfTheDay.openCloseValues.close || "",
          jod: latestReceiptOfTheDay.openCloseValues.jod || "",
        };
      }
    }
    return lastOpenClose;
  }, []);

  const fetchReceipts = useCallback(async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API_BASE_URI}/api/receipts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const fetchedReceipts = response.data.receipts || [];

      // --- NEW SORT LOGIC (REQUEST 3) ---
      // Sort by _id descending. Mongo ObjectIDs are chronological.
      // This will put the most recently created/updated receipts first.
      fetchedReceipts.sort((a, b) => {
        if (a._id > b._id) return -1;
        if (a._id < b._id) return 1;
        return 0;
      });
      // --- END NEW SORT LOGIC ---

      setReceipts(fetchedReceipts);

      if (!formData._id) {
        const latestOpenClose = fetchLatestOpenCloseValues(fetchedReceipts);
        setOpenCloseValues(latestOpenClose);
      }
    } catch (error) {
      toast.error("Failed to load saved receipts.");
    }
  }, [token, formData._id, fetchLatestOpenCloseValues]);

  useEffect(() => {
    fetchCustomers();
    fetchReceipts();
  }, [fetchCustomers, fetchReceipts]);

  // --- UPDATED: This effect now loads magil/advance/cutting ONLY ---
  useEffect(() => {
    // --- FIX: Only run if serialNumberInput *actually changes* ---
    if (serialNumberInput === prevSerialNumberRef.current) {
      return;
    }

    const serial = serialNumberInput;
    const serialAsNumber = parseInt(serial, 10);

    if (isEditingRef.current) {
      prevSerialNumberRef.current = serialNumberInput; // Update ref even in edit mode
      return;
    }

    if (
      !isNaN(serialAsNumber) &&
      serialAsNumber > 0 &&
      customerList.length > 0
    ) {
      const customer = customerList.find((c) => c.srNo === serialAsNumber);
      if (customer) {
        // Find all receipts for this customer
        const customerReceipts = receipts.filter(
          (r) => r.customerId === customer._id
        );

        let lastPendingAmount = "";
        let lastAdvanceAmount = "";
        let lastCuttingAmount = ""; // --- (REQUEST 4)
        let newGameRows = getInitialGameRows(); // Start with fresh rows

        if (customerReceipts.length > 0) {
          // Sort receipts to find the most recent one
          customerReceipts.sort((a, b) => {
            const dateA = dayjs(a.date);
            const dateB = dayjs(b.date);
            const dateDiff = dateB.diff(dateA);
            if (dateDiff !== 0) return dateDiff;
            if (b._id > a._id) return 1;
            if (a._id < b._id) return -1;
            return 0;
          });
          const latestReceipt = customerReceipts[0];

          // Load 'pendingAmount' (मागील) from the *last* receipt's final total
          if (latestReceipt.finalTotalAfterChuk !== undefined) {
            lastPendingAmount = latestReceipt.finalTotalAfterChuk.toString();
          }

          // Load other carry-over values
          if (latestReceipt.finalTotal !== undefined) {
            lastAdvanceAmount = latestReceipt.finalTotal.toString();
          }

          // --- MODIFIED (REQUEST 4): Load cutting amount ---
          lastCuttingAmount = latestReceipt.cuttingAmount?.toString() || "";

          // --- REMOVED (REQUEST 1): Logic to load aa/ku income removed ---
        }

        // Set the form data
        setFormData((prev) => ({
          ...prev,
          customerId: customer._id,
          customerName: customer.name,
          pendingAmount: lastPendingAmount,
          advanceAmount: lastAdvanceAmount,
          cuttingAmount: lastCuttingAmount, // --- MODIFIED (REQUEST 4)
          jama: "", // --- CRITICAL FIX: Reset jama to empty ---
          chuk: "", // Reset chuk
          chukPercentage: "10", // Reset chuk percentage
          isChukEnabled: false, // Reset chuk checkbox
        }));
        // --- UPDATED: Use the new game rows ---
        setGameRows(newGameRows); // This will be getInitialGameRows()
      }
    } else {
      // Clear form data if serial is invalid or empty
      setFormData((prev) => ({
        ...prev,
        customerId: "",
        customerName: "",
        pendingAmount: "",
        advanceAmount: "",
        cuttingAmount: "",
        jama: "", // Also clear jama here
        chuk: "",
        chukPercentage: "10",
        isChukEnabled: false,
      }));
      setGameRows(getInitialGameRows());
    }

    // --- FIX: Update the ref *after* logic runs ---
    prevSerialNumberRef.current = serialNumberInput;

    // --- FIX: Add 'receipts' to dependency array ---
  }, [serialNumberInput, customerList, receipts]);

  // --- UPDATED: Click-outside handler for BOTH dropdowns ---
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Customer search dropdown
      if (
        customerSearchRef.current &&
        !customerSearchRef.current.contains(event.target)
      ) {
        setIsCustomerDropdownOpen(false);
        setCustomerSearch(""); // Clear search on click outside
      }

      // NEW: Special header dropdown
      if (
        specialHeaderRef.current &&
        !specialHeaderRef.current.contains(event.target)
      ) {
        setIsSpecialDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []); // Empty dependency array is correct

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === "isChukEnabled") {
      setFormData((prev) => ({
        ...prev,
        isChukEnabled: checked,
        chuk: "", // Clear chuk amount when toggling
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleOpenCloseChange = (e) => {
    const { name, value } = e.target;
    setOpenCloseValues((prev) => ({ ...prev, [name]: value }));
  };

  // --- UPDATED: Row change handler now includes 'panType' ---
  const handleRowChange = (index, e) => {
    const { name, value } = e.target;
    const updatedRows = [...gameRows];

    if (["o", "jod", "ko"].includes(name)) {
      const formattedValue = value
        .replace(/\s/g, "+")
        .replace(/\+{2,}/g, "+");
      updatedRows[index][name] = formattedValue;
    } else if (name === "panVal1" || name === "panVal2") {
      const field = name === "panVal1" ? "val1" : "val2";
      updatedRows[index].pan = { ...updatedRows[index].pan, [field]: value };
    } else if (name === "panType") {
      // --- NEW: Handle Pan Type (SP/DP) change ---
      updatedRows[index].pan = { ...updatedRows[index].pan, type: value };
    } else if (name === "gunVal1" || name === "gunVal2") {
      const field = name === "gunVal1" ? "val1" : "val2";
      updatedRows[index].gun = { ...updatedRows[index].gun, [field]: value };
    }
    // --- UPDATED: Handle 'special' field changes (was 'jbf') ---
    else if (name === "specialVal1" || name === "specialVal2") {
      const field = name === "specialVal1" ? "val1" : "val2";
      updatedRows[index].special = {
        ...updatedRows[index].special,
        [field]: value,
      };
    } else if (name === "specialType") {
      // This is now controlled globally, but leaving for safety
      updatedRows[index].special = {
        ...updatedRows[index].special,
        type: value,
      };
    }
    // --- END UPDATE ---
    else {
      updatedRows[index][name] = value;
    }
    setGameRows(updatedRows);
  };

  const handleMultiplierChange = (index, value) => {
    const updatedRows = [...gameRows];
    updatedRows[index].multiplier = Number(value) || 0;
    setGameRows(updatedRows);
  };

  // --- UPDATED: AddRow now respects globalSpecialType and adds pan.type ---
  const addRow = () => {
    if (gameRows.length < 10) {
      const newRow = {
        id: Date.now(),
        type: "",
        income: "",
        o: "",
        jod: "",
        ko: "",
        pan: { val1: "", val2: "", type: "sp" }, // MODIFIED
        gun: { val1: "", val2: "" },
        special: { type: globalSpecialType, val1: "", val2: "" }, // MODIFIED
        multiplier: 8,
      };
      setGameRows([...gameRows, newRow]);
      toast.success("New empty row added successfully!");
    } else {
      toast.warn("You can add a maximum of 10 rows.");
    }
  };

  const removeRow = (index) => {
    // --- FIX: This logic is correct and now works
    if (index > 1) {
      const updatedRows = gameRows.filter((_, i) => i !== index);
      setGameRows(updatedRows);
    } else {
      toast.warn("Cannot remove the initial rows.");
    }
  };

  const calculationResults = useMemo(() => {
    let oFinalTotal = 0,
      jodFinalTotal = 0,
      koFinalTotal = 0,
      panFinalTotal = 0,
      gunFinalTotal = 0,
      specialFinalTotal = 0; // --- NEW: Combined total

    gameRows.forEach((row) => {
      const oVal = evaluateExpression(row.o);
      const jodVal = evaluateExpression(row.jod);
      const koVal = evaluateExpression(row.ko);
      const multiplier = row.multiplier;

      if (multiplier !== undefined) {
        oFinalTotal += oVal * Number(multiplier);
        jodFinalTotal += jodVal * Number(multiplier) * 10;
        koFinalTotal += koVal * Number(multiplier);
      } else {
        oFinalTotal += oVal;
        jodFinalTotal += jodVal;
        koFinalTotal += koVal;
      }

      const panVal1 = Number(row.pan?.val1) || 0;
      const panVal2 = Number(row.pan?.val2) || 0;
      panFinalTotal += panVal1 * panVal2;

      const gunVal1 = Number(row.gun?.val1) || 0;
      const gunVal2 = Number(row.gun?.val2) || 0;
      gunFinalTotal += gunVal1 * gunVal2;

      // --- NEW: Calculate 'special' total ---
      const specialVal1 = Number(row.special?.val1) || 0;
      const specialVal2 = Number(row.special?.val2) || 0;
      specialFinalTotal += specialVal1 * specialVal2;
    });

    const totalIncome = gameRows.reduce(
      (sum, row) => sum + (Number(row.income) || 0), // Use Number(row.income)
      0
    );
    // --- UPDATED: Payment calculation ---
    const payment =
      oFinalTotal +
      jodFinalTotal +
      koFinalTotal +
      panFinalTotal +
      gunFinalTotal +
      specialFinalTotal; // --- UPDATED

    const deductionRate = Number(formData.deductionRate) || 0;
    const deduction = totalIncome * (deductionRate / 100);
    const afterDeduction = totalIncome - deduction;
    const remainingBalance = afterDeduction - payment;
    const pendingAmount = Number(formData.pendingAmount) || 0;
    const totalDue = remainingBalance + pendingAmount;
    const jama = Number(formData.jama) || 0;

    // --- UPDATED: Chuk calculation based on LD percentage ---
    const jamaTotal = totalDue - jama; // This is the total *before* chuk
    let chuk;
    if (formData.isChukEnabled) {
      const perc = Number(formData.chukPercentage) || 0;
      chuk = jamaTotal * (perc / 100);
    } else {
      chuk = Number(formData.chuk) || 0;
    }
    // --- END UPDATE ---

    const advanceAmount = Number(formData.advanceAmount) || 0;
    const cuttingAmount = Number(formData.cuttingAmount) || 0;

    const finalTotalAfterChuk = jamaTotal - chuk;
    const finalTotal = advanceAmount - cuttingAmount;

    return {
      totalIncome,
      payment,
      deduction,
      afterDeduction,
      remainingBalance,
      totalDue,
      finalTotal,
      jamaTotal, // This is BEFORE chuk
      chuk, // This is the calculated or entered chuk
      finalTotalAfterChuk,
      oFinalTotal,
      jodFinalTotal,
      koFinalTotal,
      panFinalTotal,
      gunFinalTotal,
      specialFinalTotal, // --- UPDATED
    };
  }, [
    gameRows,
    formData.pendingAmount,
    formData.advanceAmount,
    formData.cuttingAmount,
    formData.jama,
    formData.chuk, // We depend on this for 'NA' mode
    formData.isChukEnabled, // And this
    formData.chukPercentage, // And this
    formData.deductionRate,
  ]);

  // This effect updates the 'payment' field
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      payment: calculationResults.payment.toFixed(2),
    }));
  }, [calculationResults.payment]);

  // --- NEW: Effect to update the 'chuk' input field if LD is checked ---
  useEffect(() => {
    if (formData.isChukEnabled) {
      // calculationResults.chuk already has the calculated value
      const newChuk = calculationResults.chuk.toFixed(2);
      // Set it *only if it's different* to avoid loop
      if (formData.chuk !== newChuk) {
        setFormData((prev) => ({ ...prev, chuk: newChuk }));
      }
    }
  }, [
    formData.isChukEnabled,
    calculationResults.chuk, // This is the calculated value
    formData.chuk, // Need this to prevent loop
  ]);

  const handleSave = async (clear = true) => {
    if (!formData.customerId) {
      toast.error("Please select a customer.");
      return false;
    }

    const receiptToSend = {
      ...formData,
      ...calculationResults,
      openCloseValues,
      gameRows,
      date: dayjs(formData.date, "DD-MM-YYYY").toISOString(),
    };

    try {
      if (formData._id) {
        // --- This is an UPDATE (PUT) ---
        await axios.put(
          `${API_BASE_URI}/api/receipts/${formData._id}`,
          receiptToSend,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success("Receipt updated successfully!");
      } else {
        // --- This is a NEW (POST) ---
        await axios.post(
          `${API_BASE_URI}/api/receipts`,
          receiptToSend,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success("Receipt saved successfully!");
      }

      // --- CRITICAL: Refresh receipts list *after* save ---
      // This will fetch the newly sorted list (Request 3)
      await fetchReceipts();

      if (clear) {
        clearForm();
      }
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Error saving receipt");
      console.error("Save error:", error);
      return false;
    }
  };

  // --- UPDATED: handleEdit now sanitizes pan.type and sets globalSpecialType ---
  const handleEdit = (id) => {
    isEditingRef.current = true;
    const receipt = receipts.find((r) => r._id === id);
    if (!receipt) {
      toast.error("Could not find receipt to edit.");
      return;
    }
    const customer = customerList.find((c) => c._id === receipt.customerId);

    setSerialNumberInput(customer ? customer.srNo.toString() : "");
    setCustomerSearch("");
    setIsCustomerDropdownOpen(false);

    // --- UPDATED: Sanitization logic for game rows
    const sanitizedGameRows = (receipt.gameRows || getInitialGameRows()).map(
      (row) => {
        // --- Pan sanitization (simplified)
        const panData = row.pan;
        let newPan = { val1: "", val2: "", type: "sp" }; // MODIFIED
        if (typeof panData === "object" && panData !== null) {
          newPan.val1 = panData.val1 || "";
          newPan.val2 = panData.val2 || "";
          newPan.type = panData.type || "sp"; // MODIFIED: Ensure type exists
        } else if (typeof panData === "string") {
          newPan.val1 = panData; // Handle very old format
        }

        // --- NEW: Sanitize 'special' field
        let newSpecial = { type: "jackpot", val1: "", val2: "" };
        if (row.special) {
          newSpecial = row.special;
        } else if (row.jackpot) {
          // Map old data
          newSpecial = {
            type: "jackpot",
            val1: row.jackpot.val1 || "",
            val2: row.jackpot.val2 || "",
          };
        } else if (row.berij) {
          // Map old data
          newSpecial = {
            type: "berij",
            val1: row.berij.val1 || "",
            val2: row.berij.val2 || "",
          };
        } else if (row.frak) {
          // Map old data
          newSpecial = {
            type: "frak",
            val1: row.frak.val1 || "",
            val2: row.frak.val2 || "",
          };
        }

        return {
          ...row,
          pan: newPan, // Use sanitized pan
          gun: typeof row.gun === "object" ? row.gun : { val1: "", val2: "" },
          special: newSpecial, // Use sanitized special field
          // Remove old fields if they exist
          jackpot: undefined,
          berij: undefined,
          frak: undefined,
        };
      }
    );

    const englishDay = dayjs(receipt.date).format("dddd");

    // --- NEW: Set the global special type based on loaded data
    setGlobalSpecialType(sanitizedGameRows[0]?.special?.type || "jackpot");

    setFormData({
      _id: receipt._id,
      businessName: receipt.businessName || "Bappa Gaming",
      customerId: receipt.customerId,
      customerName: customer?.name || receipt.customerName,
      customerCompany: receipt.customerCompany || "",
      day: getMarathiDay(englishDay),
      date: dayjs(receipt.date).format("DD-MM-YYYY"),
      payment: receipt.payment || "",
      pendingAmount: receipt.pendingAmount?.toString() || "",
      advanceAmount: receipt.advanceAmount?.toString() || "",
      cuttingAmount: receipt.cuttingAmount?.toString() || "",
      jama: receipt.jama?.toString() || "",
      chuk: receipt.chuk?.toString() || "",
      isChukEnabled: !!receipt.isChukEnabled,
      chukPercentage: receipt.chukPercentage?.toString() || "10", // ADDED
      deductionRate: receipt.deductionRate?.toString() || "10",
    });

    setGameRows(sanitizedGameRows);

    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this receipt?")) {
      try {
        await axios.delete(`${API_BASE_URI}/api/receipts/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        // --- FIX: Refresh receipt list after delete ---
        await fetchReceipts(); // This will fetch the sorted list
        toast.success("Receipt deleted successfully.");
      } catch (error) {
        toast.error("Failed to delete receipt.");
        console.error("Delete error:", error);
      }
    }
  };

  const handlePrint = async () => {
    // This calls handleSave, which now calls fetchReceipts (which sorts)
    const savedSuccessfully = await handleSave(false);
    if (savedSuccessfully) {
      setTimeout(() => {
        window.print();
      }, 50);
    }
  };

  // --- **** NEW, FIXED handleShare **** ---
  const handleShare = async () => {
    // 1. Check ref
    if (!printRef.current) {
      toast.error("Receipt element not found.");
      return;
    }

    // 2. Set loading state & apply class
    setIsSharing(true);
    toast.info("Generating image...");
    printRef.current.classList.add("sharing-view");

    let dataUrl;
    let file;

    // --- STAGE 1: Image Generation & Sharing ---
    try {
      // 3. Generate image
      dataUrl = await toJpeg(printRef.current, {
        quality: 0.95,
        backgroundColor: "#ffffff",
        width: 1100,
      });

      // 4. Prepare file
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      file = new File(
        [blob],
        `receipt-${formData.customerName}-${formData.date}.jpg`,
        { type: "image/jpeg" }
      );

      // 5. Attempt to share
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: "Receipt",
          text: `Receipt for ${formData.customerName} on ${formData.date}`,
          files: [file],
        });
      } else {
        // 6. Fallback download
        toast.warn("Web Share not supported. Downloading image.");
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = `receipt-${formData.customerName}-${formData.date}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      // This catch block now *only* handles errors from image gen or sharing
      if (error.name === "AbortError") {
        // User cancelled the share dialog. This is fine.
        toast.info("Share cancelled.");
      } else {
        // A real error happened during image gen or share
        console.error("Image/Share Error:", error);
        toast.error("Failed to generate image for sharing.");

        // Clean up and exit *before* trying to save
        if (printRef.current) {
          printRef.current.classList.remove("sharing-view");
        }
        setIsSharing(false);
        return; // Don't proceed to save
      }
    }

    // --- STAGE 2: Saving ---
    // This part runs if Stage 1 succeeded OR if the user just cancelled the share.
    // It does *not* run if Stage 1 had a *real* error.
    try {
      toast.info("Saving receipt...");
      await handleSave(false);
    } catch (saveError) {
      console.error("Save Error after share:", saveError);
      toast.error("Image was shared, but failed to save receipt.");
    } finally {
      // --- STAGE 3: Cleanup ---
      // This *always* runs
      if (printRef.current) {
        printRef.current.classList.remove("sharing-view");
      }
      setIsSharing(false);
    }
  };
  // --- **** END of new handleShare **** ---

  // --- UPDATED: Global Handler now takes a string value ---
  const handleGlobalSpecialTypeChange = (newType) => {
    setGlobalSpecialType(newType);
    setIsSpecialDropdownOpen(false); // Close dropdown on selection

    // Update all game rows to use this new type
    setGameRows((prevRows) =>
      prevRows.map((row) => ({
        ...row,
        special: {
          // Ensure special object exists and spread its old values
          ...(row.special || { val1: "", val2: "" }),
          type: newType, // Set the new type
        },
      }))
    );
  };

  const handleTablePrint = (id) => {
    handleEdit(id);
    setTimeout(() => {
      handlePrint();
    }, 200);
  };

  // --- MODIFIED: Filter logic now checks both search terms ---
  const filteredReceipts = receipts.filter((r) => {
    const customerNameMatch = (r.customerName || "")
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const companyNameMatch = (r.customerCompany || "")
      .toLowerCase()
      .includes(companySearchTerm.toLowerCase());
    return customerNameMatch && companyNameMatch;
  });

  const getCustomerSrNo = (customerId) => {
    const customer = customerList.find((c) => c._id === customerId);
    return customer ? customer.srNo : serialNumberInput || "N/A";
  };

  // --- UPDATED: renderComplexCell now includes SD/DP dropdown for 'pan' ---
  const renderComplexCell = (index, fieldName) => {
    const row = gameRows[index];
    const data = row[fieldName] || { val1: "", val2: "" };
    const result = (Number(data.val1) || 0) * (Number(data.val2) || 0);

    // NEW: Logic for Pan dropdown
    const isPan = fieldName === "pan";
    const panType = isPan ? data.type || "sp" : "sp";

    return (
      <div className="flex flex-col items-center justify-center space-y-1 text-sm p-1">
        {/* Input row */}
        <div className="print-hidden flex items-center justify-center space-x-1">
          <input
            type="number"
            name={`${fieldName}Val1`}
            value={data.val1 || ""}
            onChange={(e) => handleRowChange(index, e)}
            className="w-10 text-center border border-gray-300 rounded p-0.5"
          />
          <span className="text-gray-600">×</span>
          <input
            type="number"
            name={`${fieldName}Val2`}
            value={data.val2 || ""}
            onChange={(e) => handleRowChange(index, e)}
            className="w-10 text-center border border-gray-300 rounded p-0.5"
          />
        </div>

        {/* Total row (print-hidden) */}
        <div className="print-hidden text-sm font-semibold">
          = {result.toFixed(0)}
        </div>

        {/* --- NEW: Dropdown for Pan (SD/DP) --- */}
        {isPan && (
          <div className="print-hidden flex justify-center mt-1">
            <select
              name="panType" // This name must match handleRowChange
              value={panType}
              onChange={(e) => handleRowChange(index, e)} // Pass index
              className="border border-gray-300 rounded p-0.5 text-xs"
            >
              <option value="sd">Sp</option>
              <option value="dp">DP</option>
            </select>
          </div>
        )}

        {/* Updated print/share div */}
        <div className="hidden print:block text-sm">
          {data.val1 || "_"} × {data.val2 || "_"} = {result.toFixed(0)}
          {/* --- NEW: Show SP/DP on print --- */}
          {isPan && (
            <span className="text-xs font-normal">
              {" "}
              ({panType.toUpperCase()})
            </span>
          )}
        </div>
      </div>
    );
  };

  // --- UPDATED: renderSpecialCell (Dropdown REMOVED) ---
  const renderSpecialCell = (index) => {
    const row = gameRows[index];
    const data = row.special || { type: "jackpot", val1: "", val2: "" };
    const result = (Number(data.val1) || 0) * (Number(data.val2) || 0);

    return (
      <div className="flex flex-col items-center justify-center space-y-1 text-sm p-1">
        {/* Input row */}
        <div className="print-hidden flex items-center justify-center space-x-1">
          <input
            type="number"
            name="specialVal1"
            value={data.val1 || ""}
            onChange={(e) => handleRowChange(index, e)}
            className="w-10 text-center border border-gray-300 rounded p-0.5"
          />
          <span className="text-gray-600">×</span>
          <input
            type="number"
            name="specialVal2"
            value={data.val2 || ""}
            onChange={(e) => handleRowChange(index, e)}
            className="w-10 text-center border border-gray-300 rounded p-0.5"
          />
        </div>

        {/* Total row (print-hidden) */}
        <div className="print-hidden text-sm font-semibold">
          = {result.toFixed(0)}
        </div>

        {/* Dropdown for type (REMOVED - Now controlled globally) */}

        {/* Updated print/share div */}
        <div className="hidden print:block text-sm">
          {data.val1 || "_"} × {data.val2 || "_"} = {result.toFixed(0)}
          {data.type === "berij" && (
            <span className="text-xs font-normal"> (बे)</span>
          )}
          {data.type === "frak" && (
            <span className="text-xs font-normal"> (फ)</span>
          )}
          {data.type === "jackpot" && (
            <span className="text-xs font-normal"> (जॅ)</span>
          )}
        </div>
      </div>
    );
  };

  // Filtered customer list for the dropdown
  const filteredCustomerList = useMemo(() => {
    return customerList.filter((customer) => {
      const search = customerSearch.toLowerCase();
      if (!search) return true; // Show all if search is empty
      const nameMatch = customer.name.toLowerCase().includes(search);
      const srNoMatch = customer.srNo.toString().includes(search);
      return nameMatch || srNoMatch;
    });
  }, [customerSearch, customerList]);

  // Handlers for the searchable input
  const handleCustomerSearchChange = (e) => {
    isEditingRef.current = false;
    setCustomerSearch(e.target.value);
    setIsCustomerDropdownOpen(true);
    if (serialNumberInput) {
      setSerialNumberInput("");
    }
  };

  const handleCustomerSelect = (customer) => {
    isEditingRef.current = false;
    setSerialNumberInput(customer.srNo.toString());
    setCustomerSearch("");
    setIsCustomerDropdownOpen(false);
  };

  // Logic for the input's display value
  const selectedCustomer = useMemo(
    () => customerList.find((c) => c.srNo.toString() === serialNumberInput),
    [serialNumberInput, customerList]
  );

  const customerDisplayValue = isCustomerDropdownOpen
    ? customerSearch
    : selectedCustomer
    ? `${selectedCustomer.srNo} - ${selectedCustomer.name}`
    : customerSearch;

  // --- NEW: Calculate the header name based on state ---
  const specialColumnHeader = useMemo(() => {
    if (globalSpecialType === "berij") return "बेरीज";
    if (globalSpecialType === "frak") return "फरक";
    // if (globalSpecialType === "frak") return "फरक";
    return "जॅकपॉट"; // Default
  }, [globalSpecialType]);

  return (
    <div className="min-h-screen bg-gray-100 p-2 sm:p-8 font-sans">
      {isSharing && (
        <div className="fixed inset-0 bg-white z-50"></div>
      )}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        style={{ zIndex: 99999 }}
      />

      {/* --- ALL STYLE CHANGES ARE IN THIS BLOCK --- */}
      <style>{`
        .sharing-view {
          position: fixed !important; 
          top: 0 !important;
          left: 0 !important;
          z-index: 40 !important;
          opacity: 1 !important;
          background: white !important;
          border: 2px solid black !important;
          box-shadow: none !important;
          margin: 0 !important;
          padding: 0.5rem !important;
          font-size: 13px !important; /* Kept from last change */
          font-weight: bold !important;
          width: 1100px !important; 
          height: auto !important;
          overflow: hidden !important; 
        }
       
        .sharing-view .overflow-x-auto {
            overflow: visible !important; 
        }
        .sharing-view .print-hidden {
          display: none !important; 
        }
        .sharing-view .hidden.print\\:inline { display: inline !important; }
        .sharing-view .hidden.print\\:block { display: block !important; }

        .sharing-view h2 {
          font-size: 20px !important; /* Kept from last change */
          margin: 0 0 0.25rem 0 !important;
          text-align: center !important; font-weight: bold !important;
        }
        .sharing-view .header-section {
          padding-bottom: 0.25rem !important; 
          border-bottom: 2px solid #000 !important;
          position: relative !important;
        }
        .sharing-view .company-header {
          text-align: center !important; 
          font-size: 15px !important; /* Kept from last change */
          font-weight: bold !important; margin: 0.25rem 0 !important;
        }
        .sharing-view .info-section {
          margin-top: 0.25rem !important; 
        }
        .sharing-view .values-section-print {
          display: block !important;
          position: absolute !important;
          top: 35px !important; 
          right: 0.5rem !important;
          border: none !important;
          padding: 0 !important;
        }
        .sharing-view .values-row {
          display: flex !important;
          justify-content: space-between !important;
          gap: 1rem !important;
        }
        .sharing-view input, .sharing-view select {
          border: none !important; background: transparent !important;
          padding: 0 !important; color: black !important;
          -webkit-appearance: none; -moz-appearance: none; appearance: none;
          text-align: inherit; font-size: inherit !important;
          font-family: inherit; font-weight: inherit !important;
          min-width: 0 !important;
        }
        .sharing-view table {
          width: 100% !important; 
          margin: 0.2rem 0 !important; /* CHANGED from 0.4rem */
        }
        .sharing-view th, .sharing-view td {
          padding: 6px 4px !important; /* CHANGED from 8px 4px */
          border: 1px solid #000 !important;
          vertical-align: middle !important;
          text-align: center;
        }
        .sharing-view td { text-align: right; }
        .sharing-view td:first-child { text-align: center; }
        .sharing-view .bottom-box-container { 
          margin-top: 0.2rem !important; /* CHANGED from 0.5rem */
        } 
        .sharing-view .bottom-box {
          border: 1px solid #000 !important;
          padding: 7px !important; 
          font-weight: bold !important;
        }
        .sharing-view .bottom-box div {
          /* inherits 13px */
        }
        .sharing-view .bottom-box > div.flex {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
        }
        .sharing-view .bottom-box > div.flex > span:first-child,
        .sharing-view .bottom-box > div.flex > div:first-child {
          min-width: 90px; text-align: left !important;
        }
        .sharing-view .bottom-box > div.flex > input,
        .sharing-view .bottom-box > div.flex > span.font-bold {
          flex: 1; text-align: right !important; width: auto !important;
        }
        .sharing-view #add-row-button, .sharing-view button {
          display: none !important;
        }
       
        @media print {
          @page {
            size: A4 landscape;
            margin: 0.2in; 
          }
          body * { visibility: hidden; }
          .printable-area, .printable-area * { visibility: visible; }
          .printable-area {
            position: absolute; left: 0; top: 0; width: 100%; height: auto;
            border: 2px solid black !important;
            box-shadow: none !important; margin: 0;
            padding: 0.5rem !important;
            font-size: 13px !important; /* Kept */
            font-weight: bold !important;
          }
          .print-hidden { display: none !important; }
          .printable-area h2 {
            font-size: 20px !important; /* Kept */
            margin: 0 0 0.25rem 0 !important;
            text-align: center !important; font-weight: bold !important;
          }
          .printable-area .header-section {
            padding-bottom: 0.25rem !important; 
            border-bottom: 2px solid #000 !important;
            position: relative !important;
          }
          .printable-area .company-header {
            text-align: center !important; 
            font-size: 15px !important; /* Kept */
            font-weight: bold !important; margin: 0.25rem 0 !important;
          }
          .printable-area .info-section {
            margin-top: 0.25rem !important; 
          }
          .printable-area .values-section-print {
            display: block !important;
            position: absolute !important;
            top: 35px !important; 
            right: 0.5rem !important;
            border: none !important;
            padding: 0 !important;
          }
          .printable-area .values-row {
            display: flex !important;
            justify-content: space-between !important;
            gap: 1rem !important;
          }
          .printable-area input, .printable-area select {
            border: none !important; background: transparent !important;
            padding: 0 !important; color: black !important;
            -webkit-appearance: none; -moz-appearance: none; appearance: none;
            text-align: inherit; font-size: inherit !important;
            font-family: inherit; font-weight: inherit !important;
            min-width: 0 !important;
          }
          .printable-area table {
            width: 100% !important; 
            margin: 0.2rem 0 !important; /* CHANGED from 0.4rem */
          }
          .printable-area th, .printable-area td {
            padding: 6px 4px !important; /* CHANGED from 8px 4px */
            border: 1px solid #000 !important;
            vertical-align: middle !important;
            text-align: center;
          }
          .printable-area td {
            text-align: right;
          }
          .printable-area td:first-child {
            text-align: center;
          }
          .printable-area .bottom-box-container {
            margin-top: 0.2rem !important; /* CHANGED from 0.5rem */
          } 
          .printable-area .bottom-box {
            border: 1px solid #000 !important;
            padding: 7px !important; 
            font-weight: bold !important;
          }
          .printable-area .bottom-box div {
            /* inherits 13px */
          }
          .printable-area .bottom-box > div.flex {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
          }
          .printable-area .bottom-box > div.flex > span:first-child,
          .printable-area .bottom-box > div.flex > div:first-child {
            min-width: 90px;
            text-align: left !important;
          }
          .printable-area .bottom-box > div.flex > input,
          .printable-area .bottom-box > div.flex > span.font-bold {
            flex: 1;
            text-align: right !important;
            width: auto !important;
          }
          #add-row-button, .printable-area button {
            display: none !important;
          }
        }

        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button {
          -webkit-appearance: none; margin: 0;
        }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      {/* --- END OF STYLE BLOCK --- */}

      <div
        ref={formRef}
        className="max-w-7xl mx-auto bg-white rounded-lg shadow-xl p-4 sm:p-8"
      >
        <div
          ref={printRef}
          className="printable-area p-4 border border-gray-400 rounded-lg"
        >
          {/* Header Section */}
          <div className="header-section relative pb-4 mb-4">
            <div className="text-center">
              <h2 className="font-bold text-2xl">{formData.businessName}</h2>
              <div className="company-header">
                <span className="print-hidden">
                  <select
                    name="customerCompany"
                    value={formData.customerCompany}
                    onChange={handleChange}
                    className="ml-2 bg-transparent border rounded p-1 text-sm"
                  >
                    <option value="">Choose Company...</option>
                    {COMPANY_NAMES.map((company, index) => (
                      <option key={index} value={company}>
                        {company}
                      </option>
                    ))}
                  </select>
                </span>
                <span className="hidden print:inline font-bold">
                  Company Name : {formData.customerCompany || "N/A"}
                </span>
              </div>
            </div>

            {/* Open/Close/Jod Inputs (Print Hidden) */}
            <div className="values-section absolute top-0 right-0 p-2 space-y-1 border rounded-md bg-gray-50 print-hidden">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm mr-2">Open:</span>
                <input
                  type="text"
                  name="open"
                  value={openCloseValues.open}
                  onChange={handleOpenCloseChange}
                  className="w-20 text-center border border-gray-300 rounded text-sm p-0.5"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm mr-2">Close:</span>
                <input
                  type="text"
                  name="close"
                  value={openCloseValues.close}
                  onChange={handleOpenCloseChange}
                  className="w-20 text-center border border-gray-300 rounded text-sm p-0.5"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm mr-2">Jod:</span>
                <input
                  type="text"
                  name="jod"
                  value={openCloseValues.jod}
                  onChange={handleOpenCloseChange}
                  className="w-20 text-center border border-gray-300 rounded text-sm p-0.5"
                />
              </div>
            </div>

            {/* Open/Close/Jod Display (Print Visible) */}
            <div className="values-section-print hidden">
              <div className="values-row">
                <span>ओपन:</span>
                <span>{openCloseValues.open || "___"}</span>
              </div>
              <div className="values-row">
                <span>क्लोज:</span>
                <span>{openCloseValues.close || "___"}</span>
              </div>
              <div className="values-row">
                <span>जोड:</span>
                <span>{openCloseValues.jod || "___"}</span>
              </div>
            </div>

            {/* Date, Day, and Customer Info */}
            <div className="info-section mt-4">
              <div className="date-info">
                <div>
                  वार:- <span className="font-semibold">{formData.day}</span>
                </div>
                <div>
                  दि:- <span className="font-semibold">{formData.date}</span>
                </div>
                <div className="mt-2">
                  <div className="print-hidden">
                    <div
                      className="flex flex-col items-start relative w-64"
                      ref={customerSearchRef}
                    >
                      <div className="flex items-center w-full">
                        <strong className="mr-2">Sr.No:</strong>
                        <input
                          type="search"
                          placeholder="Search S.No or Name..."
                          value={customerDisplayValue}
                          onChange={handleCustomerSearchChange}
                          onFocus={() => setIsCustomerDropdownOpen(true)}
                          className="p-1 flex-1 rounded-md border bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {isCustomerDropdownOpen &&
                        filteredCustomerList.length > 0 && (
                          <div className="absolute top-full mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
                            {filteredCustomerList.map((customer) => (
                              <div
                                key={customer._id}
                                className="p-2 hover:bg-gray-100 cursor-pointer"
                                onClick={() => handleCustomerSelect(customer)}
                              >
                                {customer.srNo} - {customer.name}
                              </div>
                            ))}
                          </div>
                        )}

                      <div className="mt-2 pl-1">
                        <span className="font-bold text-black-700">
                          {formData.customerName
                            ? `Customer Name: ${formData.customerName}`
                            : "No customer selected"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="hidden print:inline customer-info">
                    <strong>Sr.No:</strong>{" "}
                    {getCustomerSrNo(formData.customerId)} |
                    <strong> Customer Name:</strong>{" "}
                    {formData.customerName || "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Game Rows Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed border-collapse">
              {/* --- THIS IS THE UPDATED <colgroup> --- */}
              <colgroup>
                <col style={{ width: "6%" }} /> {/* ओ. */}
                <col style={{ width: "10%" }} /> {/* रक्कम (WAS 12%) */}
                <col style={{ width: "12%" }} /> {/* ओ. */}
                <col style={{ width: "12%" }} /> {/* जोड */}
                <col style={{ width: "12%" }} /> {/* को. */}
                <col style={{ width: "12%" }} /> {/* पान (WAS 15%) */}
                <col style={{ width: "12%" }} /> {/* गुण (WAS 15%) */}
                <col style={{ width: "12%" }} /> {/* जॅकपॉट/बे/फ */}
              </colgroup>
              {/* --- END OF <colgroup> UPDATE --- */}
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-center">ओ.</th>
                  <th className="border p-2 text-center">रक्कम</th>
                  <th className="border p-2 text-center">ओ.</th>
                  <th className="border p-2 text-center">जोड</th>
                  <th className="border p-2 text-center">को.</th>
                  <th className="border p-2 text-center">पान</th>
                  <th className="border p-2 text-center">गुण</th>

                  {/* --- NEW: Header Dropdown --- */}
                  <th
                    className="border p-2 text-center relative"
                    ref={specialHeaderRef}
                  >
                    <button
                      type="button"
                      onClick={() => setIsSpecialDropdownOpen((prev) => !prev)}
                      className="print-hidden font-bold text-blue-600 hover:text-blue-800"
                    >
                      {specialColumnHeader} ▾
                    </button>
                    <span className="hidden print:inline">
                      {specialColumnHeader}
                    </span>

                    {isSpecialDropdownOpen && (
                      <div className="print-hidden absolute top-full left-1/2 -translate-x-1/2 mt-1 w-24 bg-white border border-gray-300 rounded-md shadow-lg z-20">
                        <div
                          className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                          onClick={() =>
                            handleGlobalSpecialTypeChange("jackpot")
                          }
                        >
                          जॅकपॉट
                        </div>
                        <div
                          className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                          onClick={() =>
                            handleGlobalSpecialTypeChange("berij")
                          }
                        >
                          बेरीज
                        </div>
                        <div
                          className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                          onClick={() =>
                            handleGlobalSpecialTypeChange("frak")
                          }
                        >
                          फरक
                        </div>
                      </div>
                    )}
                  </th>
                  {/* --- END NEW HEADER --- */}
                </tr>
              </thead>
              <tbody>
                {gameRows.map((row, index) => {
                  const multiplier = row.multiplier;
                  const hasMultiplier = multiplier !== undefined;

                  const renderCellWithCalculation = (colName) => {
                    const effectiveMultiplier =
                      colName === "jod" ? multiplier * 10 : multiplier;
                    const cellTotal =
                      evaluateExpression(row[colName]) * effectiveMultiplier;

                    return (
                      <div className="flex flex-col items-end p-1">
                        <input
                          type="text"
                          name={colName}
                          value={row[colName]}
                          onChange={(e) => handleRowChange(index, e)}
                          className="w-full text-right bg-white border border-gray-300 rounded-md p-1 text-sm mb-1 print-hidden"
                        />
                        <div className="hidden print:block w-full print:text-center print:border-b print:border-gray-400 print:pb-1 print:mb-1">
                          {row[colName] || "_"}
                        </div>

                        {hasMultiplier && (
                          <span className="text-gray-500 whitespace-nowrap flex items-center justify-end print-hidden">
                            *{" "}
                            <input
                              type="number"
                              value={effectiveMultiplier}
                              onChange={(e) =>
                                handleMultiplierChange(
                                  index,
                                  colName === "jod"
                                    ? Number(e.target.value) / 10
                                    : e.target.value
                                )
                              }
                              className="w-8 text-center bg-transparent focus:outline-none"
                            />
                            <span className="ml-1">
                              = {cellTotal.toFixed(0)}
                            </span>
                          </span>
                        )}

                        {hasMultiplier && (
                          <span className="hidden print:inline text-xs">
                            * {effectiveMultiplier} = {cellTotal.toFixed(0)}
                          </span>
                        )}
                      </div>
                    );
                  };

                  // --- UPDATED: Simplified cell rendering ---
                  const panCell = renderComplexCell(index, "pan");
                  const gunCell = renderComplexCell(index, "gun");
                  const jbfCell = renderSpecialCell(index); // Use special renderer

                  if (row.type === "") {
                    return (
                      <tr key={row.id}>
                        <td
                          colSpan="2"
                          className="border-l border-r border-t border-b p-2"
                        ></td>
                        <td className="border border-l p-1">
                          {renderCellWithCalculation("o")}
                        </td>
                        <td className="border border-l p-1">
                          {renderCellWithCalculation("jod")}
                        </td>
                        <td className="border border-l p-1">
                          {renderCellWithCalculation("ko")}
                        </td>
                        <td className="border border-l p-1">{panCell}</td>
                        <td className="border border-l p-1">{gunCell}</td>
                        {/* --- UPDATED: jbfCell with remove button --- */}
                        <td className="border border-l p-1">
                          <div className="flex items-center justify-center">
                            {jbfCell}
                            <button
                              onClick={() => removeRow(index)}
                              className="print-hidden text-red-500 hover:text-red-700 ml-1"
                            >
                              <FaMinus size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  } else {
                    return (
                      <tr key={row.id}>
                        <td className="border p-2">{row.type}</td>
                        <td className="border p-2">
                          <input
                            type="text"
                            name="income"
                            value={row.income}
                            onChange={(e) => handleRowChange(index, e)}
                            className="w-full text-right border border-gray-300 rounded p-1 print-hidden"
                          />
                          <span className="hidden print:block text-right">
                            {row.income}
                          </span>
                        </td>
                        <td className="border p-1">
                          {renderCellWithCalculation("o")}
                        </td>
                        <td className="border p-1">
                          {renderCellWithCalculation("jod")}
                        </td>
                        <td className="border p-1">
                          {renderCellWithCalculation("ko")}
                        </td>
                        <td className="border p-1">{panCell}</td>
                        <td className="border p-1">{gunCell}</td>
                        {/* --- UPDATED: jbfCell --- */}
                        <td className="border p-1">{jbfCell}</td>
                      </tr>
                    );
                  }
                })}
              </tbody>
              <tbody className="bg-gray-50">
                <tr>
                  <td className="border p-2">टो.</td>
                  <td className="border p-2 text-right">
                    {calculationResults.totalIncome.toFixed(2)}
                  </td>
                  {/* --- UPDATED: colSpan from 8 to 6 --- */}
                  <td colSpan="6" className="border p-2"></td>
                </tr>
                <tr>
                  <td className="border p-2">क.</td>
                  <td className="border p-2 text-right">
                    <div className="flex items-center justify-end print-hidden">
                      <input
                        type="number"
                        name="deductionRate"
                        value={formData.deductionRate}
                        onChange={handleChange}
                        className="w-10 text-right bg-white border-b p-1"
                        min="0"
                        max="100"
                      />
                      <span className="ml-1">%</span>
                    </div>
                    <span className="font-bold">
                      {calculationResults.deduction.toFixed(2)}
                    </span>
                  </td>
                  {/* --- UPDATED: colSpan from 8 to 6 --- */}
                  <td colSpan="6" className="border p-2"></td>
                </tr>
                <tr>
                  <td className="border p-2">टो.</td>
                  <td className="border p-2 text-right">
                    {calculationResults.afterDeduction.toFixed(2)}
                  </td>
                  {/* --- UPDATED: colSpan from 8 to 6 --- */}
                  <td colSpan="6" className="border p-2"></td>
                </tr>
                <tr>
                  <td className="border p-2">पें.</td>
                  <td className="border p-2 text-right">
                    {calculationResults.payment.toFixed(2)}
                  </td>
                  {/* --- UPDATED: colSpan from 8 to 6 --- */}
                  <td colSpan="6" className="border p-2"></td>
                </tr>
                <tr>
                  <td className="border p-2">टो.</td>
                  <td className="border p-2 text-right">
                    {calculationResults.remainingBalance.toFixed(2)}
                  </td>
                  {/* --- UPDATED: colSpan from 8 to 6 --- */}
                  <td colSpan="6" className="border p-2"></td>
                </tr>
                <tr>
                  <td className="border p-2">मा.</td>
                  <td className="border p-2">
                    <input
                      type="number"
                      name="pendingAmount"
                      value={formData.pendingAmount}
                      onChange={handleChange}
                      className="w-full text-right bg-white border-b p-1 print-hidden"
                    />
                    <span className="hidden print:block text-right">
                      {formData.pendingAmount || 0}
                    </span>
                  </td>
                  {/* --- UPDATED: colSpan from 8 to 6 --- */}
                  <td colSpan="6" className="border p-2"></td>
                </tr>
                <tr>
                  <td className="border p-2">टो.</td>
                  <td className="border p-2 text-right">
                    {calculationResults.totalDue.toFixed(2)}
                  </td>
                  {/* --- UPDATED: colSpan from 8 to 6 --- */}
                  <td colSpan="6" className="border p-2"></td>
                </tr>
                <tr className="bg-gray-50">
                  <td
                    colSpan="2"
                    className="border p-2 font-bold text-right align-middle"
                  >
                    Total *
                  </td>
                  <td className="border p-2 font-medium text-right">
                    {calculationResults.oFinalTotal.toFixed(2)}
                  </td>
                  <td className="border p-2 font-medium text-right">
                    {calculationResults.jodFinalTotal.toFixed(2)}
                  </td>
                  <td className="border p-2 font-medium text-right">
                    {calculationResults.koFinalTotal.toFixed(2)}
                  </td>
                  <td className="border p-2 font-medium text-right">
                    {calculationResults.panFinalTotal.toFixed(2)}
                  </td>
                  <td className="border p-2 font-medium text-right">
                    {calculationResults.gunFinalTotal.toFixed(2)}
                  </td>
                  {/* --- UPDATED: Total cell for special --- */}
                  <td className="border p-2 font-medium text-right">
                    {calculationResults.specialFinalTotal.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-2 flex justify-end print-hidden">
            <button
              id="add-row-button"
              onClick={addRow}
              className="flex items-center px-3 py-1 bg-blue-500 text-white rounded-md shadow-sm hover:bg-blue-600 text-sm"
            >
              <FaPlus size={12} className="mr-1" /> Add Row
            </button>
          </div>

          {/* Bottom Calculation Boxes */}
          <div className="flex flex-col sm:flex-row justify-between mt-4 bottom-box-container">
            <div className="w-full sm:w-1/2 sm:mr-2 mb-4 sm:mb-0 p-2 border rounded-md space-y-2 text-sm bottom-box">
              <div className="flex justify-between items-center">
                <span>जमा:-</span>
                <input
                  type="number"
                  name="jama"
                  value={formData.jama}
                  onChange={handleChange}
                  className="w-2/3 text-right bg-transparent border-b print-hidden"
                />
                <span className="hidden print:inline font-bold">
                  {formData.jama || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span>टो:-</span>
                <span className="font-bold">
                  {calculationResults.jamaTotal.toFixed(2)}
                </span>
              </div>

              {/* --- UPDATED: Chuk Section with Percentage --- */}
              <div className="flex justify-between items-center">
                <div className="flex items-center print-hidden">
                  <span className="mr-1">चूक:</span>
                  <input
                    type="checkbox"
                    name="isChukEnabled"
                    id="isChukEnabled"
                    checked={formData.isChukEnabled}
                    onChange={handleChange}
                    className="mr-1"
                  />
                  <label htmlFor="isChukEnabled" className="text-xs">
                    {formData.isChukEnabled ? "(LD)" : "(NA)"}
                  </label>
                </div>
                <span className="hidden print:inline">
                  चूक {formData.isChukEnabled ? "(LD)" : "(NA)"}:-
                </span>

                {/* Percentage Input (Show if LD) */}
                {formData.isChukEnabled && (
                  <div className="print-hidden flex items-center">
                    <input
                      type="number"
                      name="chukPercentage"
                      value={formData.chukPercentage}
                      onChange={handleChange}
                      className="w-12 text-right bg-transparent border-b"
                    />
                    <span className="ml-1">%</span>
                  </div>
                )}

                {/* Chuk Amount Input */}
                <input
                  type="number"
                  name="chuk"
                  value={formData.chuk}
                  onChange={handleChange}
                  disabled={formData.isChukEnabled} // Disable if LD
                  className={`w-1/3 text-right bg-transparent border-b print-hidden ${
                    formData.isChukEnabled ? "bg-gray-100" : ""
                  }`}
                  placeholder={
                    formData.isChukEnabled ? "Calculated" : "Enter amount"
                  }
                />
                <span className="hidden print:inline font-bold">
                  {Number(calculationResults.chuk || 0).toFixed(2)}
                </span>
              </div>
              {/* --- END UPDATE --- */}

              <div className="flex justify-between">
                <span>
                  अंतिम टोटल{" "}
                  {calculationResults.finalTotalAfterChuk < 0
                    ? "(देणे)"
                    : "(येणे)"}
                  :-
                </span>
                <span className="font-bold">
                  {Math.abs(calculationResults.finalTotalAfterChuk).toFixed(2)}
                </span>
              </div>
            </div>
            <div className="w-full sm:w-1/2 sm:ml-2 p-2 border rounded-md space-y-2 text-sm bottom-box">
              <div className="flex justify-between items-center">
                <span>आड:-</span>
                <input
                  type="number"
                  name="advanceAmount"
                  value={formData.advanceAmount}
                  onChange={handleChange}
                  className="w-2/3 text-right bg-transparent border-b print-hidden"
                />
                <span className="hidden print:inline font-bold">
                  {formData.advanceAmount || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>कटिंग:-</span>
                <input
                  type="number"
                  name="cuttingAmount"
                  value={formData.cuttingAmount}
                  onChange={handleChange}
                  className="w-2/3 text-right bg-transparent border-b print-hidden"
                />
                <span className="hidden print:inline font-bold">
                  {formData.cuttingAmount || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span>टो:-</span>
                <span className="font-bold">
                  {calculationResults.finalTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons (Print Hidden) */}
        <div className="print-hidden flex flex-wrap justify-center items-center mt-6 gap-4">
          <button
            onClick={() => handleSave(true)}
            className="px-6 py-2 bg-green-500 text-white rounded-full shadow-lg hover:bg-green-600"
          >
            Save
          </button>
          <button
            onClick={handlePrint}
            className="px-6 py-2 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 flex items-center"
          >
            <FaPrint className="mr-2" />
            Print
          </button>
          <button
            onClick={handleShare}
            disabled={isSharing}
            className="px-6 py-2 bg-purple-500 text-white rounded-full shadow-lg hover:bg-purple-600 flex items-center disabled:opacity-50"
          >
            <FaShareAlt className="mr-2" />
            {isSharing ? "Sharing..." : "Share"}
          </button>
          <button
            onClick={clearForm}
            className="px-6 py-2 bg-gray-500 text-white rounded-full shadow-lg hover:bg-gray-600"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="print-hidden mt-8 max-w-7xl mx-auto bg-white rounded-lg shadow-xl p-4 sm:p-8">
        <h2 className="text-2xl font-bold mb-4">Saved Receipts</h2>
        {/* --- NEW: Search filter container --- */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <input
            type="text"
            placeholder="Search Receipts by Customer Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-1/2 p-3 border border-gray-300 rounded-md"
          />
          <input
            type="text"
            placeholder="Search by Company Name..."
            value={companySearchTerm}
            onChange={(e) => setCompanySearchTerm(e.target.value)}
            className="w-full sm:w-1/2 p-3 border border-gray-300 rounded-md"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* The 'receipts' array is now sorted, so 'filteredReceipts' will be sorted too */}
              {filteredReceipts.length > 0 ? (
                filteredReceipts.map((r) => (
                  <tr key={r._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {r.customerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {r.customerCompany || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {dayjs(r.date).format("DD-MM-YYYY")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {r.finalTotalAfterChuk &&
                        Number(r.finalTotalAfterChuk).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center space-x-3">
                      <button
                        onClick={() => handleEdit(r._id)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <FaEdit size={18} />
                      </button>
                      <button
                        onClick={() => handleTablePrint(r._id)}
                        className="text-green-600 hover:text-green-800"
                      >
                        <FaPrint size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(r._id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <FaTrashAlt size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="5"
                    className="text-center py-4 text-gray-500"
                  >
                    No receipts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReceiptForm;