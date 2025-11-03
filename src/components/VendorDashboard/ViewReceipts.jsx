import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import dayjs from "dayjs";
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { FaTrashAlt, FaPrint, FaSpinner, FaSearch, FaEdit } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";

dayjs.extend(customParseFormat);

const API_BASE_URI = "https://game-book.onrender.com";

const toNum = (value) => Number(value) || 0;

// Helper function to safely evaluate arithmetic expressions
const evaluateExpression = (expression) => {
  if (typeof expression !== 'string' || !expression.trim()) {
    return 0;
  }
  try {
    let sanitized = expression.replace(/[^0-9+\-*/.]/g, '');
    sanitized = sanitized.replace(/[+\-*/.]+$/, "");
    if (!sanitized) return 0;
    // eslint-disable-next-line no-eval
    const result = eval(sanitized);
    return isFinite(result) ? result : 0;
  } catch (error) {
    return 0;
  }
};

// A fully detailed and accurate component for printing receipts.
const PrintableReceipt = React.forwardRef(({ receiptData }, ref) => {
  if (!receiptData) return null;

  // --- ADDED: Logic to get the header for the 'special' column ---
  const getSpecialHeader = () => {
    const firstRowType = receiptData?.gameRows?.[0]?.special?.type || 'jackpot';
    if (firstRowType === 'berij') return 'बेरीज';
    if (firstRowType === 'frak') return 'फरक';
    return 'जॅकपॉट';
  };

  return (
    <div ref={ref} className="printable-area p-4 bg-white text-black">
      {/* Header Section */}
      <div className="header-section relative pb-4 mb-4 text-center">
        <h2 className="font-bold text-2xl">{receiptData.businessName}</h2>
        <div className="font-bold">
          Company Name : {receiptData.customerCompany || "N/A"}
        </div>
      </div>

      {/* Info Section */}
      <div className="info-section flex justify-between items-start mb-4">
        <div className="date-info">
          <div>वार:- <span className="font-semibold">{receiptData.day}</span></div>
          <div>दि:- <span className="font-semibold">{dayjs(receiptData.date).format("DD-MM-YYYY")}</span></div>
          <div className="mt-2">
            <strong>Customer Name:</strong> {receiptData.customerName || "N/A"}
          </div>
        </div>
        <div className="values-section-print">
          <div className="values-row flex justify-between"><span className="font-bold">Open:</span><span>{receiptData.openCloseValues?.open || "___"}</span></div>
          <div className="values-row flex justify-between"><span className="font-bold">Close:</span><span>{receiptData.openCloseValues?.close || "___"}</span></div>
          <div className="values-row flex justify-between"><span className="font-bold">Jod:</span><span>{receiptData.openCloseValues?.jod || "___"}</span></div>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm table-fixed border-collapse border border-black">
          {/* --- MODIFIED: Colgroup updated to 8 columns --- */}
          <colgroup>
            <col style={{ width: "6%" }} />  {/* ओ. */}
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
              <th className="border border-black p-1 text-center">ओ.</th>
              <th className="border border-black p-1 text-center">रक्कम</th>
              <th className="border border-black p-1 text-center">ओ.</th>
              <th className="border border-black p-1 text-center">जोड</th>
              <th className="border border-black p-1 text-center">को.</th>
              <th className="border border-black p-1 text-center">पान</th>
              <th className="border border-black p-1 text-center">गुण</th>
              {/* --- ADDED: Header for new column --- */}
              <th className="border border-black p-1 text-center">{getSpecialHeader()}</th>
            </tr>
          </thead>
          <tbody>
            {(receiptData.gameRows || []).map((row, index) => {
              const multiplier = row.multiplier;
              const hasMultiplier = multiplier !== undefined;

              const renderCellWithCalculation = (colName) => {
                const effectiveMultiplier = colName === "jod" ? multiplier * 10 : multiplier;
                const cellTotal = evaluateExpression(row[colName]) * effectiveMultiplier;

                return (
                  <div className="flex flex-col items-end p-1">
                    <div className="w-full text-center border-b border-gray-400 pb-1 mb-1">{row[colName] || '_'}</div>
                    {hasMultiplier && (
                      <span className="text-gray-500 whitespace-nowrap flex items-center justify-center">
                        * {effectiveMultiplier}
                        <span className="ml-1">= {cellTotal.toFixed(0)}</span>
                      </span>
                    )}
                  </div>
                );
              };

              // --- ADDED: Logic to render the 'special' cell ---
              const renderSpecialCell = () => {
                const data = row.special || { type: 'jackpot', val1: '', val2: '' };
                const result = (toNum(data.val1) * toNum(data.val2)).toFixed(0);
                let typeAbbr = '(जॅ)';
                if (data.type === 'berij') typeAbbr = '(बे)';
                if (data.type === 'frak') typeAbbr = '(फ)';

                return (
                  <div className="flex flex-col items-center justify-center p-1 text-center">
                    <div>{`${data.val1 || '_'} × ${data.val2 || '_'} = ${result}`}</div>
                    <span className="text-xs font-normal">{typeAbbr}</span>
                  </div>
                );
              };

              return (
                <tr key={row.id || index}>
                  <td className="border border-black p-1">{row.type || ''}</td>
                  <td className="border border-black p-1 text-right">{row.income || ''}</td>
                  <td className="border border-black p-1">{renderCellWithCalculation("o")}</td>
                  <td className="border border-black p-1">{renderCellWithCalculation("jod")}</td>
                  <td className="border border-black p-1">{renderCellWithCalculation("ko")}</td>
                  <td className="border border-black p-1 text-center">{`${row.pan?.val1 || '_'} × ${row.pan?.val2 || '_'} = ${(toNum(row.pan?.val1) * toNum(row.pan?.val2)).toFixed(0)}`}</td>
                  <td className="border border-black p-1 text-center">{`${row.gun?.val1 || '_'} × ${row.gun?.val2 || '_'} = ${(toNum(row.gun?.val1) * toNum(row.gun?.val2)).toFixed(0)}`}</td>
                  {/* --- ADDED: Render the new cell --- */}
                  <td className="border border-black p-1">{renderSpecialCell()}</td>
                </tr>
              );
            })}
            {/* --- MODIFIED: colSpan updated to 6 --- */}
            <tr><td className="border border-black p-1">टो.</td><td className="border border-black p-1 text-right font-bold">{toNum(receiptData.totalIncome).toFixed(2)}</td><td colSpan="6" className="border border-black p-1"></td></tr>
            <tr><td className="border border-black p-1">क.</td><td className="border border-black p-1 text-right font-bold">{toNum(receiptData.deduction).toFixed(2)}</td><td colSpan="6" className="border border-black p-1"></td></tr>
            <tr><td className="border border-black p-1">टो.</td><td className="border border-black p-1 text-right font-bold">{toNum(receiptData.afterDeduction).toFixed(2)}</td><td colSpan="6" className="border border-black p-1"></td></tr>
            <tr><td className="border border-black p-1">पें.</td><td className="border border-black p-1 text-right">{toNum(receiptData.payment).toFixed(2)}</td><td colSpan="6" className="border border-black p-1"></td></tr>
            <tr><td className="border border-black p-1">टो.</td><td className="border border-black p-1 text-right">{toNum(receiptData.remainingBalance).toFixed(2)}</td><td colSpan="6" className="border border-black p-1"></td></tr>
            <tr><td className="border border-black p-1">मा.</td><td className="border border-black p-1 text-right">{toNum(receiptData.pendingAmount).toFixed(2)}</td><td colSpan="6" className="border border-black p-1"></td></tr>
            <tr><td className="border border-black p-1">टो.</td><td className="border border-black p-1 text-right font-bold">{toNum(receiptData.totalDue).toFixed(2)}</td><td colSpan="6" className="border border-black p-1"></td></tr>
            <tr className="bg-gray-50">
              <td colSpan="2" className="border border-black p-1 font-bold text-right align-middle">Total *</td>
              <td className="border border-black p-1 font-medium text-right">{toNum(receiptData.oFinalTotal).toFixed(2)}</td>
              <td className="border border-black p-1 font-medium text-right">{toNum(receiptData.jodFinalTotal).toFixed(2)}</td>
              <td className="border border-black p-1 font-medium text-right">{toNum(receiptData.koFinalTotal).toFixed(2)}</td>
              <td className="border border-black p-1 font-medium text-right">{toNum(receiptData.panFinalTotal).toFixed(2)}</td>
              <td className="border border-black p-1 font-medium text-right">{toNum(receiptData.gunFinalTotal).toFixed(2)}</td>
              {/* --- ADDED: Total for new column --- */}
                <td className="border border-black p-1 font-medium text-right">{toNum(receiptData.specialFinalTotal).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer Calculation Boxes */}
      <div className="flex justify-between mt-4 bottom-box-container">
        <div className="w-1/2 mr-2 p-2 border border-black rounded-md space-y-2 text-sm bottom-box">
          <div className="flex justify-between"><span>जमा:-</span><span>{toNum(receiptData.jama).toFixed(2)}</span></div>
          <div className="flex justify-between"><span>टो:-</span><span className="font-bold">{toNum(receiptData.jamaTotal).toFixed(2)}</span></div>
          <div className="flex justify-between"><span>चूक:-</span><span>{toNum(receiptData.chuk).toFixed(2)}</span></div>
          <div className="flex justify-between"><span>अंतिम टोटल:-</span><span className="font-bold">{toNum(receiptData.finalTotalAfterChuk).toFixed(2)}</span></div>
        </div>
        <div className="w-1/2 ml-2 p-2 border border-black rounded-md space-y-2 text-sm bottom-box">
          <div className="flex justify-between"><span>आड:-</span><span>{toNum(receiptData.advanceAmount).toFixed(2)}</span></div>
          <div className="flex justify-between"><span>कटिंग:-</span><span>{toNum(receiptData.cuttingAmount).toFixed(2)}</span></div>
          <div className="flex justify-between"><span>टो:-</span><span className="font-bold">{toNum(receiptData.finalTotal).toFixed(2)}</span></div>
        </div>
      </div>
    </div>
  );
});


const ViewReceipts = () => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [receiptToPrint, setReceiptToPrint] = useState(null);
  const [customerList, setCustomerList] = useState([]); 

  const printRef = useRef();
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  // --- MODIFIED: fetchReceipts no longer sets loading state
  const fetchReceipts = useCallback(async () => {
    if (!token) {
      toast.error("Authentication error. Please log in again.");
      return;
    }
    try {
      const res = await axios.get(`${API_BASE_URI}/api/receipts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const sortedReceipts = (res.data.receipts || []).sort((a, b) => new Date(b.date) - new Date(a.date));
      setReceipts(sortedReceipts);
    } catch (err) {
      console.error("Error fetching receipts:", err);
      toast.error(err.response?.data?.message || "Failed to fetch receipts.");
    }
  }, [token]);

  // --- MODIFIED: fetchCustomers no longer sets loading state
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
    if (window.confirm(`Are you sure you want to delete the receipt for ${receiptToDelete.customerName}?`)) {
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

  // --- THIS IS CORRECT ---
  // It navigates to your form component, which will then
  // use the ID from the URL to fetch and populate the data.
  const handleEdit = (receiptId) => {
    navigate(`/vendor/create-receipt/${receiptId}`);
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
    customerList.forEach(customer => {
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
    return (
      receipt.customerName.toLowerCase().includes(searchTerm) ||
      receipt.customerSrNo.toString().toLowerCase().includes(searchTerm)
    );
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
        {receiptToPrint && <PrintableReceipt receiptData={receiptToPrint} ref={printRef} />}
      </div>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .printable-area, .printable-area * { visibility: visible; }
          .printable-area { 
              position: absolute; 
              left: 0; 
              top: 0; 
              width: 100%; 
              height: auto;
              font-size: 11px !important;
              line-height: 1.2 !important;
          }
          .print-hidden { display: none; }
          .printable-area .header-section {
              margin-bottom: 0.5rem !important;
              padding-bottom: 0.3rem !important;
              border-bottom: 1px solid #ccc !important;
          }
          .printable-area table {
              border-collapse: collapse !important;
G         }
          .printable-area th, .printable-area td {
              padding: 6px 2px !important;
              border: 1px solid #000 !important;
          }
          .printable-area .bottom-box {
              border: 1px solid #000 !important;
          }
        }
      `}</style>
      <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8 print-hidden">
        <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
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
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sr.No</th>


                 <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Name</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Final Total</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReceipts.length > 0 ? (
                  filteredReceipts.map((receipt) => (
                  <tr key={receipt._id} className="hover:bg-gray-50 transition">
                      <td className="py-4 px-4 text-sm font-bold text-gray-800 w-16">{receipt.customerSrNo}</td>
                   <td className="py-4 px-4 text-sm text-gray-800">{receipt.customerName}</td>
                      <td className="py-4 px-4 text-sm text-gray-500">{dayjs(receipt.date).format("DD-MM-YYYY")}</td>
                   <td className="py-4 px-4 text-sm text-gray-800 font-semibold">₹{toNum(receipt.finalTotalAfterChuk).toFixed(2)}</td>
                      <td className="py-4 px-4 text-sm">
                        <div className="flex gap-4">
                     <button onClick={() => handleEdit(receipt._id)} className="text-blue-600 hover:text-blue-800 transition" title="Edit"><FaEdit size={18} /></button>
                          <button onClick={() => handlePrint(receipt)} className="text-green-600 hover:text-green-800 transition" title="Print"><FaPrint size={18} /></button>
                          <button onClick={() => handleDelete(receipt)} className="text-red-600 hover:text-red-800 transition" title="Delete"><FaTrashAlt size={18} /></button>
                        </div>
                      </td>
                    </tr>
               ))
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center py-10 text-gray-500">No receipts found.</td>
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