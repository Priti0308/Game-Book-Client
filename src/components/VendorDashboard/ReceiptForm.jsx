import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);
import { FaEdit, FaTrashAlt, FaPrint, FaPlus, FaMinus } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";

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

const getInitialFormData = (businessName) => ({
  _id: null,
  businessName: businessName || "Bappa Gaming",
  customerId: "",
  customerName: "",
  customerCompany: "",
  day: dayjs().format("dddd"),
  date: dayjs().format("DD-MM-YYYY"),
  payment: "",
  pendingAmount: "",
  advanceAmount: "",
  cuttingAmount: "",
  jama: "",
});

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
  const printRef = useRef();
  const token = localStorage.getItem("token");
  const formRef = useRef(null);

  const clearForm = useCallback(() => {
    setFormData(getInitialFormData(formData.businessName));
    setGameRows(initialGameRows);
    setOpenCloseValues({ open: "", close: "", jod: "" });
  }, [formData.businessName]);

  const fetchCustomers = useCallback(async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API_BASE_URI}/api/customers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const customers = (response.data.customers || []).sort((a, b) =>
        a.name.localeCompare(b.name)
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

  const handleCustomerChange = (e) => {
    const selectedCustomerId = e.target.value;
    const selectedCustomer = customerList.find(
      (c) => c._id === selectedCustomerId
    );

    let lastPendingAmount = "";
    if (selectedCustomerId) {
      const customerReceipts = receipts.filter(
        (r) => r.customerId === selectedCustomerId
      );
      if (customerReceipts.length > 0) {
        customerReceipts.sort((a, b) => new Date(b.date) - new Date(a.date));
        if (customerReceipts[0].finalTotal) {
          lastPendingAmount = customerReceipts[0].finalTotal.toString();
        }
      }
    }

    setFormData((prev) => ({
      ...prev,
      customerId: selectedCustomer?._id || "",
      customerName: selectedCustomer?.name || "",
      pendingAmount: lastPendingAmount,
    }));
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
    const advanceAmount = Number(formData.advanceAmount) || 0;
    const cuttingAmount = Number(formData.cuttingAmount) || 0;

    const finalTotal = totalDue - advanceAmount - cuttingAmount;
    const jamaTotal = afterDeduction - jama;

    return {
      totalIncome,
      payment,
      deduction,
      afterDeduction,
      remainingBalance,
      totalDue,
      finalTotal,
      jamaTotal,
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
  ]);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      payment: calculationResults.payment.toFixed(2),
    }));
  }, [calculationResults.payment]);

  const handleSave = async () => {
    if (!formData.customerId) {
      toast.error("Please select a customer.");
      return;
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
      clearForm();
    } catch (error) {
      toast.error(error.response?.data?.message || "Error saving receipt");
      console.error("Save error:", error);
    }
  };
  const handleEdit = (id) => {
    const receipt = receipts.find((r) => r._id === id);
    if (!receipt) {
      toast.error("Could not find receipt to edit.");
      return;
    }
    const customer = customerList.find((c) => c._id === receipt.customerId);

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

    setFormData({
      ...getInitialFormData(receipt.businessName),
      ...receipt,
      _id: receipt._id,
      customerName: customer?.name || receipt.customerName,
      date: dayjs(receipt.date).format("DD-MM-YYYY"),
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

  const handlePrint = () => window.print();

  const handleTablePrint = (id) => {
    handleEdit(id);
    setTimeout(() => handlePrint(), 200);
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
            margin: 0.5in 0.3in 0.5in 0.3in;
          }
          body * { visibility: hidden; } 
          .printable-area, .printable-area * { visibility: visible; } 
          .printable-area { 
            position: absolute; left: 0; top: 0; width: 100%; height: auto; 
            border: none !important; box-shadow: none !important; margin: 0; 
            padding: 0.5rem !important; font-size: 11px !important;
            line-height: 1.2 !important;
          } 
          .print-hidden { display: none !important; } 
          .printable-area input, .printable-area select { 
            border: none !important; background: transparent !important; 
            padding: 0 !important; color: black !important; 
            -webkit-appearance: none; -moz-appearance: none; appearance: none; 
            text-align: inherit; font-size: inherit !important; 
            font-family: inherit; font-weight: inherit;
            min-width: 0 !important;
          }
          .printable-area table {
            width: 100% !important; table-layout: fixed !important;
            border-collapse: collapse !important; font-size: 10px !important;
            margin: 0.2rem 0 !important;
          }
          
          .printable-area th, .printable-area td {
            padding: 6px 2px !important;
            border: 1px solid #000 !important;
            word-wrap: break-word !important;
            word-break: break-all !important; 
            font-size: 9px !important;
            line-height: 1.2 !important;
            vertical-align: middle !important;
          }
          
          .printable-area th {
            background-color: #f0f0f0 !important; font-weight: bold !important;
            text-align: center !important;
          }
          .printable-area table col:nth-child(1) { width: 8% !important; }
          .printable-area table col:nth-child(2) { width: 12% !important; }
          .printable-area table col:nth-child(3) { width: 15% !important; }
          .printable-area table col:nth-child(4) { width: 15% !important; }
          .printable-area table col:nth-child(5) { width: 15% !important; }
          .printable-area table col:nth-child(6) { width: 18% !important; }
          .printable-area table col:nth-child(7) { width: 17% !important; }
          
          .printable-area input[type="text"], 
          .printable-area input[type="number"] {
            width: 100% !important; font-size: 8px !important;
            text-align: right !important; border-bottom: none !important;
            height: auto !important;
          }
          .printable-area .flex {
            display: flex !important; align-items: center !important;
            justify-content: center !important; flex-wrap: nowrap !important;
            font-size: 8px !important;
          }
          .printable-area .flex input {
            width: 15px !important; text-align: center !important;
            margin: 0 1px !important;
          }
          .printable-area .flex span { font-size: 7px !important; margin: 0 1px !important; }
          .printable-area h2 {
            font-size: 16px !important; margin: 0.3rem 0 0.5rem 0 !important;
            text-align: center !important; font-weight: bold !important;
            text-transform: uppercase !important; letter-spacing: 1px !important;
            border-bottom: 2px solid #000 !important; padding-bottom: 0.2rem !important;
          }
          .printable-area .header-section {
            margin-bottom: 0.5rem !important; padding-bottom: 0.3rem !important;
            border-bottom: 1px solid #ccc !important;
          }
          .printable-area .company-header {
            text-align: center !important; font-size: 12px !important;
            font-weight: bold !important; margin: 0.2rem 0 !important;
          }
          .printable-area .info-section {
            display: flex !important; justify-content: space-between !important;
            align-items: flex-start !important; margin: 0.3rem 0 0.5rem 0 !important;
            font-size: 10px !important;
          }
          .printable-area .date-info { font-size: 10px !important; line-height: 1.3 !important; }
          .printable-area .customer-info { font-size: 10px !important; text-align: right !important; }

          /* MODIFIED: Removed border and background from the Open/Close box for print */
          .printable-area .values-section-print {
            display: block !important;
            padding: 0 !important;
            font-size: 9px !important;
          }

          .printable-area .values-row {
            display: flex !important; justify-content: space-between !important;
            margin: 0.1rem 0 !important;
          }
          .printable-area button { display: none !important; }

          .printable-area .bottom-box-container {
            display: flex !important;
            justify-content: space-between !important;
            align-items: stretch !important;
            width: 100% !important;
            gap: 10px !important;
          }
          .printable-area .bottom-box {
            width: 49% !important;
            border: 1px solid #000 !important;
            padding: 4px !important;
          }
          
          #add-row-button {
            display: none !important;
            visibility: hidden !important;
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
                    name="customerCompany"it
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
                {/* MODIFIED: Added "Company Name :" text for print view */}
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

            <div className="info-section mt-4">
              <div className="date-info">
                <div>
                  वार:- <span className="font-semibold">{formData.day}</span>
                </div>
                <div>
                  दि:- <span className="font-semibold">{formData.date}</span>
                </div>
                <div className="mt-2">
                  <span className="print-hidden">
                    <strong className="mr-2">Customer Name:</strong>
                    <select
                      name="customerId"
                      value={formData.customerId}
                      onChange={handleCustomerChange}
                      className="p-1 w-48 rounded-md border bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Customer</option>
                      {customerList.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </span>
                  <span className="hidden print:inline customer-info">
                    <strong>Customer Name:</strong> {formData.customerName || "N/A"}
                  </span>
                </div>
              </div>

              <div className="values-section-print hidden">
                <div className="values-row">
                  <span className="font-bold">Open:</span>
                  <span>{openCloseValues.open || "___"}</span>
                </div>
                <div className="values-row">
                  <span className="font-bold">Close:</span>
                  <span>{openCloseValues.close || "___"}</span>
                </div>
                <div className="values-row">
                  <span className="font-bold">Jod:</span>
                  <span>{openCloseValues.jod || "___"}</span>
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
                            <span className="hidden print:inline">{effectiveMultiplier}</span>
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
                      readOnly
                      className="w-full text-right bg-gray-100 border-b"
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
            onClick={handleSave}
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
                      {r.finalTotal && Number(r.finalTotal).toFixed(2)}
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