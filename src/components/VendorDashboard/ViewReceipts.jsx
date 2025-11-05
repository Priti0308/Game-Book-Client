import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import "dayjs/locale/mr"; // Import Marathi locale
import {
  FaTrashAlt,
  FaPrint,
  FaSpinner,
  FaSearch,
  FaEdit,
} from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";

dayjs.extend(customParseFormat);
dayjs.locale("mr"); // Set locale to Marathi

const API_BASE_URI = "https://game-book.onrender.com";

const toNum = (value) => Number(value) || 0;

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

// --- NEW: PrintableReceipt component copied from ReceiptForm.jsx ---
// This component is now a 1:1 match with your form's print/share layout.
const PrintableReceipt = React.forwardRef(({ receiptData }, ref) => {
  if (!receiptData) return null;

  // --- Logic to get the header for the 'special' column ---
  const getSpecialHeader = () => {
    const firstRowType = receiptData?.gameRows?.[0]?.special?.type || "jackpot";
    if (firstRowType === "berij") return "बेरीज";
    if (firstRowType === "frak") return "फरक";
    return "जॅकपॉट";
  };
  const specialColumnHeader = getSpecialHeader();

  // Helper to render the complex calculation cells for print
  const renderCellWithCalculation = (row, colName) => {
    const multiplier = row.multiplier;
    const hasMultiplier = multiplier !== undefined;
    const effectiveMultiplier = colName === "jod" ? multiplier * 10 : multiplier;
    const cellTotal = evaluateExpression(row[colName]) * effectiveMultiplier;

    return (
      <div className="flex flex-col items-end p-1">
        <div className="w-full text-center border-b border-gray-400 pb-1 mb-1">
          {row[colName] || "_"}
        </div>
        {hasMultiplier && (
          <span className="text-xs">
            * {effectiveMultiplier} = {cellTotal.toFixed(0)}
          </span>
        )}
      </div>
    );
  };

  // Helper to render Pan/Gun/Special cells for print
  const renderComplexCell = (data, fieldType) => {
    const result = (toNum(data?.val1) * toNum(data?.val2)).toFixed(0);
    let typeAbbr = "";

    if (fieldType === "pan") {
      typeAbbr = `(${(data?.type || "sp").toUpperCase()})`;
    } else if (fieldType === "special") {
      if (data?.type === "berij") typeAbbr = "(बे)";
      else if (data?.type === "frak") typeAbbr = "(फ)";
      else typeAbbr = "(जॅ)";
    }

    return (
      <div className="flex flex-col items-center justify-center p-1 text-center">
        <div>{`${data?.val1 || "_"} × ${data?.val2 || "_"} = ${result}`}</div>
        {typeAbbr && <span className="text-xs font-normal">{typeAbbr}</span>}
      </div>
    );
  };

  return (
    <div
      ref={ref}
      className="printable-area p-4 border border-gray-400 rounded-lg bg-white text-black"
    >
      {/* Header Section */}
      <div className="header-section relative pb-4 mb-4">
        <div className="text-center">
          <h2 className="font-bold text-2xl">{receiptData.businessName}</h2>
          <div className="company-header">
            <span className="font-bold">
              Company Name : {receiptData.customerCompany || "N/A"}
            </span>
          </div>
        </div>

        {/* Open/Close/Jod Display (Print Visible) */}
        <div className="values-section-print hidden">
          <div className="values-row">
            <span>ओपन:</span>
            <span>{receiptData.openCloseValues?.open || "___"}</span>
          </div>
          <div className="values-row">
            <span>क्लोज:</span>
            <span>{receiptData.openCloseValues?.close || "___"}</span>
          </div>
          <div className="values-row">
            <span>जोड:</span>
            <span>{receiptData.openCloseValues?.jod || "___"}</span>
          </div>
        </div>

        {/* Date, Day, and Customer Info */}
        <div className="info-section mt-4">
          <div className="date-info">
            <div>
              वार:- <span className="font-semibold">{receiptData.day}</span>
            </div>
            <div>
              दि:-{" "}
              <span className="font-semibold">
                {dayjs(receiptData.date).format("DD-MM-YYYY")}
              </span>
            </div>
            <div className="mt-2">
              <span className="customer-info">
                <strong>Sr.No:</strong> {receiptData.customerSrNo || "N/A"} |
                <strong> Customer Name:</strong>{" "}
                {receiptData.customerName || "N/A"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Game Rows Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm table-fixed border-collapse">
          <colgroup>
            <col style={{ width: "6%" }} /> {/* ओ. */}
            <col style={{ width: "10%" }} /> {/* रक्कम */}
            <col style={{ width: "12%" }} /> {/* ओ. */}
            <col style={{ width: "12%" }} /> {/* जोड */}
            <col style={{ width: "12%" }} /> {/* को. */}
            <col style={{ width: "12%" }} /> {/* पान */}
            <col style={{ width: "12%" }} /> {/* गुण */}
            <col style={{ width: "12%" }} /> {/* जॅकपॉट/बे/फ */}
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
              <th className="border p-2 text-center">{specialColumnHeader}</th>
            </tr>
          </thead>
          <tbody>
            {(receiptData.gameRows || []).map((row, index) => {
              if (row.type === "") {
                return (
                  <tr key={row.id || index}>
                    <td colSpan="2" className="border-l border-r border-t border-b p-2"></td>
                    <td className="border border-l p-1">
                      {renderCellWithCalculation(row, "o")}
                    </td>
                    <td className="border border-l p-1">
                      {renderCellWithCalculation(row, "jod")}
                    </td>
                    <td className="border border-l p-1">
                      {renderCellWithCalculation(row, "ko")}
                    </td>
                    <td className="border border-l p-1">
                      {renderComplexCell(row.pan, "pan")}
                    </td>
                    <td className="border border-l p-1">
                      {renderComplexCell(row.gun, "gun")}
                    </td>
                    <td className="border border-l p-1">
                      {renderComplexCell(row.special, "special")}
                    </td>
                  </tr>
                );
              } else {
                return (
                  <tr key={row.id || index}>
                    <td className="border p-2">{row.type}</td>
                    <td className="border p-2 text-right">{row.income}</td>
                    <td className="border p-1">
                      {renderCellWithCalculation(row, "o")}
                    </td>
                    <td className="border p-1">
                      {renderCellWithCalculation(row, "jod")}
                    </td>
                    <td className="border p-1">
                      {renderCellWithCalculation(row, "ko")}
                    </td>
                    <td className="border border-l p-1">
                      {renderComplexCell(row.pan, "pan")}
                    </td>
                    <td className="border border-l p-1">
                      {renderComplexCell(row.gun, "gun")}
                    </td>
                    <td className="border border-l p-1">
                      {renderComplexCell(row.special, "special")}
                    </td>
                  </tr>
                );
              }
            })}
          </tbody>
          <tbody className="bg-gray-50">
            <tr>
              <td className="border p-2">टो.</td>
              <td className="border p-2 text-right">
                {toNum(receiptData.totalIncome).toFixed(2)}
              </td>
              <td colSpan="6" className="border p-2"></td>
            </tr>
            <tr>
              <td className="border p-2">क.</td>
              <td className="border p-2 text-right">
                {toNum(receiptData.deduction).toFixed(2)}
              </td>
              <td colSpan="6" className="border p-2"></td>
            </tr>
            <tr>
              <td className="border p-2">टो.</td>
              <td className="border p-2 text-right">
                {toNum(receiptData.afterDeduction).toFixed(2)}
              </td>
              <td colSpan="6" className="border p-2"></td>
            </tr>
            <tr>
              <td className="border p-2">पें.</td>
              <td className="border p-2 text-right">
                {toNum(receiptData.payment).toFixed(2)}
              </td>
              <td colSpan="6" className="border p-2"></td>
            </tr>
            <tr>
              <td className="border p-2">टो.</td>
              <td className="border p-2 text-right">
                {toNum(receiptData.remainingBalance).toFixed(2)}
              </td>
              <td colSpan="6" className="border p-2"></td>
            </tr>
            <tr>
              <td className="border p-2">मा.</td>
              <td className="border p-2 text-right">
                {toNum(receiptData.pendingAmount).toFixed(2)}
              </td>
              <td colSpan="6" className="border p-2"></td>
            </tr>
            <tr>
              <td className="border p-2">टो.</td>
              <td className="border p-2 text-right">
                {toNum(receiptData.totalDue).toFixed(2)}
              </td>
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
                {toNum(receiptData.oFinalTotal).toFixed(2)}
              </td>
              <td className="border p-2 font-medium text-right">
                {toNum(receiptData.jodFinalTotal).toFixed(2)}
              </td>
              <td className="border p-2 font-medium text-right">
                {toNum(receiptData.koFinalTotal).toFixed(2)}
              </td>
              <td className="border p-2 font-medium text-right">
                {toNum(receiptData.panFinalTotal).toFixed(2)}
              </td>
              <td className="border p-2 font-medium text-right">
                {toNum(receiptData.gunFinalTotal).toFixed(2)}
              </td>
              <td className="border p-2 font-medium text-right">
                {toNum(receiptData.specialFinalTotal).toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Bottom Calculation Boxes */}
      <div className="flex justify-between mt-4 bottom-box-container">
        <div className="w-1/2 mr-2 p-2 border rounded-md space-y-2 text-sm bottom-box">
          <div className="flex justify-between">
            <span>जमा:-</span>
            <span className="font-bold">
              {toNum(receiptData.jama).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>टो:-</span>
            <span className="font-bold">
              {toNum(receiptData.jamaTotal).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>
              चूक {receiptData.isChukEnabled ? "(LD)" : "(NA)"}:-
            </span>
            <span className="font-bold">
              {toNum(receiptData.chuk).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>
              अंतिम टोटल{" "}
              {toNum(receiptData.finalTotalAfterChuk) < 0 ? "(देणे)" : "(येणे)"}
              :-
            </span>
            <span className="font-bold">
              {Math.abs(toNum(receiptData.finalTotalAfterChuk)).toFixed(2)}
            </span>
          </div>
        </div>
        <div className="w-1/2 ml-2 p-2 border rounded-md space-y-2 text-sm bottom-box">
          <div className="flex justify-between">
            <span>आड:-</span>
            <span className="font-bold">
              {toNum(receiptData.advanceAmount).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>कटिंग:-</span>
            <span className="font-bold">
              {toNum(receiptData.cuttingAmount).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>टो:-</span>
            <span className="font-bold">
              {toNum(receiptData.finalTotal).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});
// --- END: New PrintableReceipt component ---

const ViewReceipts = () => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [receiptToPrint, setReceiptToPrint] = useState(null);
  const [customerList, setCustomerList] = useState([]);

  const printRef = useRef();
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  const fetchReceipts = useCallback(async () => {
    if (!token) {
      toast.error("Authentication error. Please log in again.");
      return;
    }
    try {
      const res = await axios.get(`${API_BASE_URI}/api/receipts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const sortedReceipts = (res.data.receipts || []).sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );
      setReceipts(sortedReceipts);
    } catch (err) {
      console.error("Error fetching receipts:", err);
      toast.error(err.response?.data?.message || "Failed to fetch receipts.");
    }
  }, [token]);

  const fetchCustomers = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_BASE_URI}/api/customers`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const sortedCustomers = (res.data.customers || []).sort(
        (a, b) => a.srNo - b.srNo
      );

      const sequentialCustomers = sortedCustomers.map((customer, index) => ({
        ...customer,
        srNo: index + 1,
      }));

      setCustomerList(sequentialCustomers);
    } catch (err) {
      console.error("Error fetching customers:", err);
    }
  }, [token]);

  useEffect(() => {
    setLoading(true); // Set master loading true
    Promise.all([fetchReceipts(), fetchCustomers()]) // Fetch both
      .finally(() => setLoading(false)); // Set master loading false when both are done
  }, [fetchReceipts, fetchCustomers]);

  const handleDelete = async (receiptToDelete) => {
    if (
      window.confirm(
        `Are you sure you want to delete the receipt for ${receiptToDelete.customerName}?`
      )
    ) {
      try {
        await axios.delete(`${API_BASE_URI}/api/receipts/${receiptToDelete._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setReceipts((prev) => prev.filter((r) => r._id !== receiptToDelete._id));
        toast.success("Receipt deleted successfully!");
      } catch (err) {
        console.error("Error deleting receipt:", err);
        toast.error(err.response?.data?.message || "Failed to delete receipt.");
      }
    }
  };

  // --- THIS EDIT LOGIC IS CORRECT ---
  // Its job is to navigate to the form with the receipt's ID.
  // The ReceiptForm.jsx component is responsible for fetching the data using this ID.
  const handleEdit = (receiptId) => {
    navigate(`/vendor/createReceipt/${receiptId}`);
  };

  const handlePrint = (receipt) => {
    setReceiptToPrint(receipt);
    setTimeout(() => {
      window.print();
      setReceiptToPrint(null);
    }, 100);
  };

  const customerSrNoMap = useMemo(() => {
    const map = new Map();
    customerList.forEach((customer) => {
      map.set(customer._id, customer.srNo);
    });
    return map;
  }, [customerList]);

  const processedReceipts = useMemo(() => {
    return receipts.map((receipt) => ({
      ...receipt,
      customerSrNo: customerSrNoMap.get(receipt.customerId) || "N/A",
    }));
  }, [receipts, customerSrNoMap]);

  const filteredReceipts = processedReceipts.filter((receipt) => {
    const searchTerm = search.toLowerCase();
    if (!searchTerm) return true; // Show all if search is empty
    const nameMatch = (receipt.customerName || "").toLowerCase().includes(searchTerm);
    
    // --- *** MODIFICATION HERE *** ---
    // Changed from .includes(searchTerm) to an exact match (===)
    const srNoMatch = receipt.customerSrNo.toString() === searchTerm;
    
    return nameMatch || srNoMatch;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <FaSpinner className="text-purple-600 text-4xl animate-spin" />
        <p className="ml-3 text-lg text-gray-700">Loading Receipts...</p>
      </div>
    );
  }

  return (
    <>
      <div className="hidden print:block">
        {receiptToPrint && (
          <PrintableReceipt receiptData={receiptToPrint} ref={printRef} />
        )}
      </div>

      {/* --- NEW: Style block copied from ReceiptForm.jsx --- */}
      <style>{`
        .printable-area {
          font-weight: bold;
        }
        
        .printable-area h2 {
          font-size: 18px !important;
          margin: 0 0 0.25rem 0 !important;
          text-align: center !important; font-weight: bold !important;
        }
        .printable-area .header-section {
          padding-bottom: 0.25rem !important;
          border-bottom: 2px solid #000 !important;
          position: relative !important;
        }
        .printable-area .company-header {
          text-align: center !important; font-size: 13px !important;
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
          font-size: 11px !important;
        }
        .printable-area .values-row {
          display: flex !important;
          justify-content: space-between !important;
          gap: 1rem !important;
        }
        .printable-area table {
          width: 100% !important; margin: 0.4rem 0 !important;
        }
        .printable-area th, .printable-area td {
          padding: 5px 3px !important;
          border: 1px solid #000 !important;
          font-size: 11px !important;
          vertical-align: middle !important;
          text-align: center;
        }
        .printable-area td { text-align: right; }
        .printable-area td:first-child { text-align: center; }
        .printable-area .bottom-box-container { margin-top: 0.5rem !important; }
        .printable-area .bottom-box {
          border: 1px solid #000 !important;
          padding: 7px !important;
          font-weight: bold !important;
        }
        .printable-area .bottom-box div {
          font-size: 11px !important;
        }
        .printable-area .bottom-box > div.flex {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
        }
        .printable-area .bottom-box > div.flex > span:first-child,
        .printable-area .bottom-box > div.flex > div:first-child {
          min-width: 90px; text-align: left !important;
        }
        .printable-area .bottom-box > div.flex > span.font-bold {
          flex: 1; text-align: right !important; width: auto !important;
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
            font-size: 11px !important;
            font-weight: bold !important;
          }
          .print-hidden { display: none !important; }
        }

        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button {
          -webkit-appearance: none; margin: 0;
        }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>
      {/* --- END: New style block --- */}

      <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8 print-hidden">
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
        />
        <div className="max-w-7xl mx-auto bg-white p-6 sm:p-8 rounded-2xl shadow-lg">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h1 className="text-3xl font-bold text-gray-800">View Receipts</h1>
            <div className="flex w-full sm:w-auto items-center gap-3">
              <div className="relative flex-grow">
                <input
                  type="text"
                  placeholder="Search by Sr.No or Name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-full border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:outline-none transition"
                />
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sr.No
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer Name
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Final Total
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReceipts.length > 0 ? (
                  filteredReceipts.map((receipt) => (
                    <tr
                      key={receipt._id}
                      className="hover:bg-gray-50 transition"
                    >
                      <td className="py-4 px-4 text-sm font-bold text-gray-800 w-16">
                        {receipt.customerSrNo}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-800">
                        {receipt.customerName}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-500">
                        {dayjs(receipt.date).format("DD-MM-YYYY")}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-800 font-semibold">
                        ₹{toNum(receipt.finalTotalAfterChuk).toFixed(2)}
                      </td>
                      <td className="py-4 px-4 text-sm">
                        <div className="flex gap-4">
                          <button
                            onClick={() => handleEdit(receipt._id)}
                            className="text-blue-600 hover:text-blue-800 transition"
                            title="Edit"
                          >
                            <FaEdit size={18} />
                          </button>
                          <button
                            onClick={() => handlePrint(receipt)}
                            className="text-green-600 hover:text-green-800 transition"
                            title="Print"
                          >
                            <FaPrint size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(receipt)}
                            className="text-red-600 hover:text-red-800 transition"
                            title="Delete"
                          >
                            <FaTrashAlt size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="5"
                      className="text-center py-10 text-gray-500"
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
    </>
  );
};

export default ViewReceipts;