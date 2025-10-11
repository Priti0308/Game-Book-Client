import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import 'dayjs/locale/mr'; // Import Marathi locale
import { FaEdit, FaTrashAlt, FaPrint, FaPlus, FaMinus } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";

dayjs.extend(customParseFormat);
dayjs.locale('mr'); // Set locale globally to Marathi

const API_BASE_URI = "https://game-book.onrender.com";

const COMPANY_NAMES = [
  "कल्याण",
  "मेन बाजार",
  "श्रीदेवी",
  "श्रीदेवी नाईट",
  "मिलन डे",
  "मिलन नाईट",
];

// Helper function to safely evaluate arithmetic expressions
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

// Helper function to get Marathi day name
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

const getInitialFormData = (businessName) => {
  const currentDayInEnglish = dayjs().format("dddd");
  return {
    _id: null,
    businessName: businessName || "Bappa Gaming",
    customerId: "",
    customerName: "",
    customerCompany: "",
    day: getMarathiDay(currentDayInEnglish),
    date: dayjs().format("DD-MM-YYYY"),
    payment: "",
    pendingAmount: "",
    advanceAmount: "",
    cuttingAmount: "",
    jama: "",
    chuk: "",
  };
};

const initialGameRows = [
  {
    id: 1,
    type: "आ.",
    income: "",
    o: "",
    jod: "",
    ko: "",
    pan: { val1: "", val2: "" },
    gun: { val1: "", val2: "" },
    multiplier: 8,
  },
  {
    id: 2,
    type: "कु.",
    income: "",
    o: "",
    jod: "",
    ko: "",
    pan: { val1: "", val2: "" },
    gun: { val1: "", val2: "" },
    multiplier: 9,
  },
];

const ReceiptForm = ({ businessName }) => {
  const [formData, setFormData] = useState(() =>
    getInitialFormData(businessName)
  );
  const [gameRows, setGameRows] = useState(initialGameRows);
  const [openCloseValues, setOpenCloseValues] = useState({
    open: "",
    close: "",
    jod: "",
  });
  const [customerList, setCustomerList] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [serialNumberInput, setSerialNumberInput] = useState("");
  const printRef = useRef();
  const token = localStorage.getItem("token");
  const formRef = useRef(null);

  const clearForm = useCallback(() => {
    setFormData(getInitialFormData(formData.businessName));
    setGameRows(initialGameRows);
    setOpenCloseValues({ open: "", close: "", jod: "" });
    setSerialNumberInput("");
  }, [formData.businessName]);

  const fetchCustomers = useCallback(async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API_BASE_URI}/api/customers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const customers = (response.data.customers || []).sort(
        (a, b) => a.srNo - b.srNo
      );
      setCustomerList(customers);
    } catch (error) {
      toast.error("Failed to fetch customer data.");
    }
  }, [token]);

  const fetchReceipts = useCallback(async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API_BASE_URI}/api/receipts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReceipts(response.data.receipts || []);
    } catch (error) {
      toast.error("Failed to load saved receipts.");
    }
  }, [token]);

  useEffect(() => {
    fetchCustomers();
    fetchReceipts();
  }, [fetchCustomers, fetchReceipts]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSerialNumberChange = (e) => {
    const serial = e.target.value;
    setSerialNumberInput(serial);
    const serialAsNumber = parseInt(serial, 10);
    if (
      !isNaN(serialAsNumber) &&
      serialAsNumber > 0 &&
      serialAsNumber <= customerList.length
    ) {
      const customer = customerList.find((c) => c.srNo === serialAsNumber);
      if (customer) {
        let lastPendingAmount = "";
        const customerReceipts = receipts.filter(
          (r) => r.customerId === customer._id
        );
        if (customerReceipts.length > 0) {
          customerReceipts.sort((a, b) => new Date(b.date) - new Date(a.date));
          if (customerReceipts[0].finalTotalAfterChuk) {
            lastPendingAmount =
              customerReceipts[0].finalTotalAfterChuk.toString();
          }
        }
        setFormData((prev) => ({
          ...prev,
          customerId: customer._id,
          customerName: customer.name,
          pendingAmount: lastPendingAmount,
        }));
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        customerId: "",
        customerName: "",
        pendingAmount: "",
      }));
    }
  };

  const handleOpenCloseChange = (e) => {
    const { name, value } = e.target;
    setOpenCloseValues((prev) => ({ ...prev, [name]: value }));
  };

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
    } else if (name === "gunVal1" || name === "gunVal2") {
      const field = name === "gunVal1" ? "val1" : "val2";
      updatedRows[index].gun = { ...updatedRows[index].gun, [field]: value };
    } else {
      updatedRows[index][name] = value;
    }
    setGameRows(updatedRows);
  };

  const handleMultiplierChange = (index, value) => {
    const updatedRows = [...gameRows];
    updatedRows[index].multiplier = Number(value) || 0;
    setGameRows(updatedRows);
  };

  const addRow = () => {
    if (gameRows.length < 10) {
      const newRow = {
        id: Date.now(),
        type: "",
        income: "",
        o: "",
        jod: "",
        ko: "",
        pan: { val1: "", val2: "" },
        gun: { val1: "", val2: "" },
        multiplier: 8,
      };
      setGameRows([...gameRows, newRow]);
      toast.success("New empty row added successfully!");
    } else {
      toast.warn("You can add a maximum of 10 rows.");
    }
  };

  const removeRow = (index) => {
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
      gunFinalTotal = 0;

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
    });

    const totalIncome = gameRows.reduce(
      (sum, row) => sum + Number(row.income || 0),
      0
    );
    const payment =
      oFinalTotal +
      jodFinalTotal +
      koFinalTotal +
      panFinalTotal +
      gunFinalTotal;
    const deduction = totalIncome * 0.1;
    const afterDeduction = totalIncome - deduction;
    const remainingBalance = afterDeduction - payment;
    const pendingAmount = Number(formData.pendingAmount) || 0;
    const totalDue = remainingBalance + pendingAmount;
    const jama = Number(formData.jama) || 0;
    const chuk = Number(formData.chuk) || 0;
    const advanceAmount = Number(formData.advanceAmount) || 0;
    const cuttingAmount = Number(formData.cuttingAmount) || 0;

    const jamaTotal = totalDue - jama;
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
      jamaTotal,
      finalTotalAfterChuk,
      oFinalTotal,
      jodFinalTotal,
      koFinalTotal,
      panFinalTotal,
      gunFinalTotal,
    };
  }, [
    gameRows,
    formData.pendingAmount,
    formData.advanceAmount,
    formData.cuttingAmount,
    formData.jama,
    formData.chuk,
  ]);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      payment: calculationResults.payment.toFixed(2),
    }));
  }, [calculationResults.payment]);

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
        const res = await axios.put(
          `${API_BASE_URI}/api/receipts/${formData._id}`,
          receiptToSend,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setReceipts(
          receipts.map((r) => (r._id === formData._id ? res.data.receipt : r))
        );
        toast.success("Receipt updated successfully!");
      } else {
        const res = await axios.post(
          `${API_BASE_URI}/api/receipts`,
          receiptToSend,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setReceipts([res.data.receipt, ...receipts]);
        toast.success("Receipt saved successfully!");
      }
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

  const handleEdit = (id) => {
    const receipt = receipts.find((r) => r._id === id);
    if (!receipt) {
      toast.error("Could not find receipt to edit.");
      return;
    }
    const customer = customerList.find((c) => c._id === receipt.customerId);
    setSerialNumberInput(customer ? customer.srNo.toString() : "");

    const sanitizedGameRows = (receipt.gameRows || initialGameRows).map(
      (row) => ({
        ...row,
        pan:
          typeof row.pan === "object"
            ? row.pan
            : { val1: row.pan || "", val2: "" },
        gun: typeof row.gun === "object" ? row.gun : { val1: "", val2: "" },
      })
    );
    const englishDay = dayjs(receipt.date).format("dddd");
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
    });

    setGameRows(sanitizedGameRows);
    setOpenCloseValues(
      receipt.openCloseValues || { open: "", close: "", jod: "" }
    );

    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this receipt?")) {
      try {
        await axios.delete(`${API_BASE_URI}/api/receipts/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setReceipts(receipts.filter((r) => r._id !== id));
        toast.success("Receipt deleted successfully.");
      } catch (error) {
        toast.error("Failed to delete receipt.");
        console.error("Delete error:", error);
      }
    }
  };

  const handlePrint = async () => {
    const savedSuccessfully = await handleSave(false);
    if (savedSuccessfully) {
      window.print();
    }
  };

  const handleTablePrint = (id) => {
    handleEdit(id);
    setTimeout(() => {
      handlePrint();
    }, 200);
  };

  const filteredReceipts = receipts.filter((r) =>
    (r.customerName || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8 font-sans">
      <ToastContainer position="top-right" autoClose={3000} />

      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0.5in;
          }
          body * { visibility: hidden; }
          .printable-area, .printable-area * { visibility: visible; }
          .printable-area {
            position: absolute; left: 0; top: 0; width: 100%; height: auto;
            border: 2px solid black !important;
            box-shadow: none !important; margin: 0;
            padding: 0.5rem !important;
            font-size: 12px !important; 
            font-weight: bold !important;
          }
          .print-hidden { display: none !important; }

          /* Header Styles */
          .printable-area h2 {
            font-size: 20px !important; margin: 0 0 0.25rem 0 !important;
            text-align: center !important; font-weight: bold !important;
          }
          .printable-area .header-section {
            padding-bottom: 0.5rem !important;
            border-bottom: 2px solid #000 !important;
            position: relative !important;
          }
          .printable-area .company-header {
            text-align: center !important; font-size: 14px !important;
            font-weight: bold !important; margin: 0.25rem 0 !important;
          }
          .printable-area .info-section {
            margin-top: 0.5rem !important;
          }

          /* Open/Close/Jod Section Style for Print */
          .printable-area .values-section-print {
            display: block !important;
            position: absolute !important;
            top: 3.8rem !important;
            right: 0.5rem !important;
            border: none !important;
            padding: 0 !important;
            font-size: 12px !important;
          }
          .printable-area .values-row {
            display: flex !important;
            justify-content: space-between !important;
            gap: 1rem !important;
          }

          /* Table, General Inputs, and Bottom Boxes */
          .printable-area input, .printable-area select {
            border: none !important; background: transparent !important;
            padding: 0 !important; color: black !important;
            -webkit-appearance: none; -moz-appearance: none; appearance: none;
            text-align: inherit; font-size: inherit !important;
            font-family: inherit; font-weight: inherit !important;
            min-width: 0 !important;
          }
          .printable-area table {
            width: 100% !important; margin: 0.5rem 0 !important;
          }
          .printable-area th, .printable-area td {
            padding: 6px 4px !important;
            border: 1px solid #000 !important;
            font-size: 12px !important;
            vertical-align: middle !important;
            text-align: center;
          }
          .printable-area td {
            text-align: right;
          }
          .printable-area td:first-child {
            text-align: center;
          }
          
          /* Summary Box Styles */
          .printable-area .bottom-box-container {
            margin-top: 1rem !important;
          }
          .printable-area .bottom-box {
            border: 1px solid #000 !important;
            padding: 8px !important;
            font-weight: bold !important;
          }
          .printable-area .bottom-box div {
            font-size: 12px !important;
          }
          /* New styles for perfect alignment in summary boxes */
          .printable-area .bottom-box > div.flex {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
          }
          .printable-area .bottom-box > div.flex > span:first-child {
            min-width: 90px;
            text-align: left !important;
          }
          .printable-area .bottom-box > div.flex > input,
          .printable-area .bottom-box > div.flex > span.font-bold {
            flex: 1;
            text-align: right !important;
            width: auto !important;
          }

          /* Hide specific elements */
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

      <div
        ref={formRef}
        className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl p-4 sm:p-8"
      >
        <div
          ref={printRef}
          className="printable-area p-4 border border-gray-400 rounded-lg"
        >
          {/* Form content */}
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
                    <div className="flex flex-col items-start">
                      <div className="flex items-center">
                        <strong className="mr-2">S.No:</strong>
                        <select
                          value={serialNumberInput}
                          onChange={handleSerialNumberChange}
                          className="p-1 w-24 rounded-md border bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select No.</option>
                          {customerList.map((customer) => (
                            <option key={customer._id} value={customer.srNo}>
                              {customer.srNo}
                            </option>
                          ))}
                        </select>
                      </div>
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
                    <strong>Customer Name:</strong>{" "}
                    {formData.customerName || "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed border-collapse">
              <colgroup>
                <col style={{ width: "8%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "17%" }} />
              </colgroup>
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-center">ओ.</th>
                  <th className="border p-2 text-center">रक्कम</th>
                  <th className="border p-2 text-center">ओ.</th>
                  <th className="border p-2 text-center">जोड</th>
                  <th className="border p-2 text-center">को.</th>
                  <th className="border p-2 text-center">पान</th>
                  <th className="border p-2 text-center">गुण</th>
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
                          {row[colName]}
                        </div>

                        {hasMultiplier && (
                          <span className="text-gray-500 whitespace-nowrap flex items-center justify-end print:justify-center">
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
                              className="w-8 text-center bg-transparent focus:outline-none print-hidden"
                            />
                            <span className="hidden print:inline">
                              {effectiveMultiplier}
                            </span>
                            <span className="ml-1">
                              = {cellTotal.toFixed(0)}
                            </span>
                          </span>
                        )}
                      </div>
                    );
                  };

                  const panVal1 = Number(row.pan?.val1) || 0;
                  const panVal2 = Number(row.pan?.val2) || 0;
                  const panResult = panVal1 * panVal2;

                  const panCell = (
                    <div className="flex items-center justify-center space-x-1 text-sm p-1">
                      <input
                        type="number"
                        name="panVal1"
                        value={row.pan?.val1 || ""}
                        onChange={(e) => handleRowChange(index, e)}
                        className="w-10 text-center border border-gray-300 rounded p-0.5"
                      />
                      <span className="text-gray-600">×</span>
                      <input
                        type="number"
                        name="panVal2"
                        value={row.pan?.val2 || ""}
                        onChange={(e) => handleRowChange(index, e)}
                        className="w-10 text-center border border-gray-300 rounded p-0.5"
                      />
                      <span className="text-gray-600">=</span>
                      <span className="text-xs">{panResult.toFixed(0)}</span>
                    </div>
                  );

                  const gunVal1 = Number(row.gun?.val1) || 0;
                  const gunVal2 = Number(row.gun?.val2) || 0;
                  const gunResult = gunVal1 * gunVal2;

                  const gunCell = (
                    <div className="flex items-center justify-center space-x-1 text-sm p-1">
                      <input
                        type="number"
                        name="gunVal1"
                        value={row.gun?.val1 || ""}
                        onChange={(e) => handleRowChange(index, e)}
                        className="w-10 text-center border border-gray-300 rounded p-0.5"
                      />
                      <span className="text-gray-600">×</span>
                      <input
                        type="number"
                        name="gunVal2"
                        value={row.gun?.val2 || ""}
                        onChange={(e) => handleRowChange(index, e)}
                        className="w-10 text-center border border-gray-300 rounded p-0.5"
                      />
                      <span className="text-gray-600">=</span>
                      <span className="text-xs">{gunResult.toFixed(0)}</span>
                    </div>
                  );

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
                        <td className="border border-l p-1">
                          <div className="flex items-center justify-center">
                            {gunCell}
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
                            className="w-full text-right border border-gray-300 rounded p-1"
                          />
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
                      </tr>
                    );
                  }
                })}
                {/* Calculation rows */}
                <tr>
                  <td className="border p-2">टो.</td>
                  <td className="border p-2 text-right">
                    {calculationResults.totalIncome.toFixed(2)}
                  </td>
                  <td colSpan="5" className="border p-2"></td>
                </tr>
                <tr>
                  <td className="border p-2">क.</td>
                  <td className="border p-2 text-right">
                    {calculationResults.deduction.toFixed(2)}
                  </td>
                  <td colSpan="5" className="border p-2"></td>
                </tr>
                <tr>
                  <td className="border p-2">टो.</td>
                  <td className="border p-2 text-right">
                    {calculationResults.afterDeduction.toFixed(2)}
                  </td>
                  <td colSpan="5" className="border p-2"></td>
                </tr>
                <tr>
                  <td className="border p-2">पें.</td>
                  <td className="border p-2 text-right">
                    {calculationResults.payment.toFixed(2)}
                  </td>
                  <td colSpan="5" className="border p-2"></td>
                </tr>
                <tr>
                  <td className="border p-2">टो.</td>
                  <td className="border p-2 text-right">
                    {calculationResults.remainingBalance.toFixed(2)}
                  </td>
                  <td colSpan="5" className="border p-2"></td>
                </tr>
                <tr>
                  <td className="border p-2">मा.</td>
                  <td className="border p-2">
                    <input
                      type="number"
                      name="pendingAmount"
                      value={formData.pendingAmount}
                      onChange={handleChange}
                      className="w-full text-right bg-white border-b p-1"
                    />
                  </td>
                  <td colSpan="5" className="border p-2"></td>
                </tr>
                <tr>
                  <td className="border p-2">टो.</td>
                  <td className="border p-2 text-right">
                    {calculationResults.totalDue.toFixed(2)}
                  </td>
                  <td colSpan="5" className="border p-2"></td>
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
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-2 flex justify-end">
            <button
              id="add-row-button"
              onClick={addRow}
              className="flex items-center px-3 py-1 bg-blue-500 text-white rounded-md shadow-sm hover:bg-blue-600 text-sm print-hidden"
            >
              <FaPlus size={12} className="mr-1" /> Add Row
            </button>
          </div>

          <div className="flex justify-between mt-4 bottom-box-container">
            <div className="w-1/2 mr-2 p-2 border rounded-md space-y-2 text-sm bottom-box">
              <div className="flex justify-between items-center">
                <span>जमा:-</span>
                <input
                  type="number"
                  name="jama"
                  value={formData.jama}
                  onChange={handleChange}
                  className="w-2/3 text-right bg-transparent border-b"
                />
              </div>
              <div className="flex justify-between">
                <span>टो:-</span>
                <span className="font-bold">
                  {calculationResults.jamaTotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>चूक:-</span>
                <input
                  type="number"
                  name="chuk"
                  value={formData.chuk}
                  onChange={handleChange}
                  className="w-2/3 text-right bg-transparent border-b"
                />
              </div>
              <div className="flex justify-between">
                <span>अंतिम टोटल:-</span>
                <span className="font-bold">
                  {calculationResults.finalTotalAfterChuk.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="w-1/2 ml-2 p-2 border rounded-md space-y-2 text-sm bottom-box">
              <div className="flex justify-between items-center">
                <span>आड:-</span>
                <input
                  type="number"
                  name="advanceAmount"
                  value={formData.advanceAmount}
                  onChange={handleChange}
                  className="w-2/3 text-right bg-transparent border-b"
                />
              </div>
              <div className="flex justify-between items-center">
                <span>कटिंग:-</span>
                <input
                  type="number"
                  name="cuttingAmount"
                  value={formData.cuttingAmount}
                  onChange={handleChange}
                  className="w-2/3 text-right bg-transparent border-b"
                />
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

        <div className="print-hidden flex justify-center mt-6 space-x-4">
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
            onClick={clearForm}
            className="px-6 py-2 bg-gray-500 text-white rounded-full shadow-lg hover:bg-gray-600"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="print-hidden mt-8 max-w-4xl mx-auto bg-white rounded-lg shadow-xl p-8">
        <h2 className="text-2xl font-bold mb-4">Saved Receipts</h2>
        <input
          type="text"
          placeholder="Search Receipts by Customer Name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 mb-4 border border-gray-300 rounded-md"
        />
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
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
              {filteredReceipts.length > 0 ? (
                filteredReceipts.map((r) => (
                  <tr key={r._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {r.customerName}
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
                  <td colSpan="4" className="text-center py-4 text-gray-500">
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