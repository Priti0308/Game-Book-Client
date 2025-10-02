import React, { useState, useEffect, useCallback, useRef } from "react";
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

// Helper function to safely evaluate arithmetic expressions, needed for printing
const evaluateExpression = (expression) => {
  if (typeof expression !== 'string' || !expression.trim()) {
    return 0;
  }
  try {
    const sanitized = expression.replace(/[^0-9+\-*/.]/g, '');
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

  return (
    <div ref={ref} className="printable-area p-8 font-sans bg-white text-sm" style={{ width: '210mm', minHeight: '297mm', margin: '0 auto', boxSizing: 'border-box' }}>
        {/* --- Header --- */}
        <div className="text-center mb-4">
            <h2 className="text-center font-bold text-2xl">{receiptData.businessName}</h2>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start mb-2 text-sm">
            <div className="w-full sm:w-1/3 mb-4 sm:mb-0">
                <div className="font-bold">Customer: {receiptData.customerName || "N/A"}</div>
            </div>
            <div className="w-full sm:w-1/3 flex flex-col items-center mb-2">
                <div className="p-2 border border-gray-500 rounded-lg w-full max-w-[220px] space-y-2 text-sm">
                    <div className="flex items-center justify-between"><span className="font-bold">Open:</span><span>{receiptData.openCloseValues?.open}</span></div>
                    <div className="flex items-center justify-between"><span className="font-bold">Close:</span><span>{receiptData.openCloseValues?.close}</span></div>
                    <div className="flex items-center justify-between"><span className="font-bold">Jod:</span><span>{receiptData.openCloseValues?.jod}</span></div>
                </div>
                <div className="mt-2 text-center text-sm"><strong>Company:</strong> {receiptData.customerCompany || "N/A"}</div>
            </div>
            <div className="w-full sm:w-1/3 text-right">
                <div>वार:- <span className="font-semibold">{receiptData.day}</span></div>
                <div>दि:- <span className="font-semibold">{dayjs(receiptData.date).format("DD-MM-YYYY")}</span></div>
            </div>
        </div>

        {/* --- Main Table Structure --- */}
        <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed border-collapse">
                <colgroup>
                    <col style={{ width: '8%' }} /><col style={{ width: '15%' }} /><col style={{ width: '19%' }} /><col style={{ width: '19%' }} /><col style={{ width: '19%' }} /><col style={{ width: '10%' }} /><col style={{ width: '10%' }} />
                </colgroup>
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border border-black p-1 text-center">ओ.</th><th className="border border-black p-1 text-center">रक्कम</th><th className="border border-black p-1 text-center">ओ.</th><th className="border border-black p-1 text-center">जोड</th><th className="border border-black p-1 text-center">को.</th><th className="border border-black p-1 text-center">पान</th><th className="border border-black p-1 text-center">गुण</th>
                    </tr>
                </thead>
                <tbody>
                {(receiptData.gameRows || []).map((row, index) => {
                    const multiplier = row.multiplier;
                    const hasMultiplier = multiplier !== undefined;
                    
                    const renderCellWithCalculation = (colName) => (
                        <div className="flex items-center justify-end">
                            <span className="w-full text-right">{row[colName]}</span>
                            {hasMultiplier && row[colName] && (
                                <span className="text-gray-500 text-xs ml-1 whitespace-nowrap flex items-center">
                                    = {evaluateExpression(row[colName])} * {multiplier}
                                </span>
                            )}
                        </div>
                    );

                    if (row.type === "") {
                    return (
                        <tr key={row.id || index}>
                            <td className="border border-black p-1"></td><td className="border border-black p-1"></td>
                            <td className="border border-black p-1">{renderCellWithCalculation('o')}</td>
                            <td className="border border-black p-1">{renderCellWithCalculation('jod')}</td>
                            <td className="border border-black p-1">{renderCellWithCalculation('ko')}</td>
                            <td className="border border-black p-1 text-center">{row.pan}</td>
                            <td className="border border-black p-1 text-center">{row.gun}</td>
                        </tr>
                    );
                    } else {
                    return (
                        <tr key={row.id || index}>
                            <td className="border border-black p-1">{row.type}</td>
                            <td className="border border-black p-1 text-right">{toNum(row.income).toFixed(2)}</td>
                            <td className="border border-black p-1">{renderCellWithCalculation('o')}</td>
                            <td className="border border-black p-1">{renderCellWithCalculation('jod')}</td>
                            <td className="border border-black p-1">{renderCellWithCalculation('ko')}</td>
                            <td className="border border-black p-1 text-center">{row.pan}</td>
                            <td className="border border-black p-1 text-center">{row.gun}</td>
                        </tr>
                    );
                    }
                })}
                </tbody>
            </table>

            <table className="w-full text-sm table-fixed border-collapse border-t-0">
                <colgroup>
                    <col style={{ width: '8%' }} /><col style={{ width: '15%' }} /><col style={{ width: '19%' }} /><col style={{ width: '19%' }} /><col style={{ width: '19%' }} /><col style={{ width: '10%' }} /><col style={{ width: '10%' }} />
                </colgroup>
                <tbody>
                    <tr><td className="border border-black p-1">टो.</td><td className="border border-black p-1 text-right font-bold">{toNum(receiptData.totalIncome).toFixed(2)}</td><td colSpan="5" className="border border-black p-1"></td></tr>
                    <tr><td className="border border-black p-1">क.</td><td className="border border-black p-1 text-right font-bold">{toNum(receiptData.deduction).toFixed(2)}</td><td colSpan="5" className="border border-black p-1"></td></tr>
                    <tr><td className="border border-black p-1">टो.</td><td className="border border-black p-1 text-right font-bold">{toNum(receiptData.afterDeduction).toFixed(2)}</td><td colSpan="5" className="border border-black p-1"></td></tr>
                    <tr><td className="border border-black p-1">पें.</td><td className="border border-black p-1 text-right">{toNum(receiptData.payment).toFixed(2)}</td><td colSpan="5" className="border border-black p-1"></td></tr>
                    <tr><td className="border border-black p-1">टो.</td><td className="border border-black p-1 text-right">{toNum(receiptData.remainingBalance).toFixed(2)}</td><td colSpan="5" className="border border-black p-1"></td></tr>
                    <tr><td className="border border-black p-1">मा.</td><td className="border border-black p-1 text-right">{toNum(receiptData.pendingAmount).toFixed(2)}</td><td colSpan="5" className="border border-black p-1"></td></tr>
                    <tr><td className="border border-black p-1">टो.</td><td className="border border-black p-1 text-right">{toNum(receiptData.finalTotal).toFixed(2)}</td><td colSpan="5" className="border border-black p-1"></td></tr>
                    <tr className="bg-gray-50">
                        <td colSpan="2" className="border border-black p-1 font-bold text-right align-middle">Total *</td>
                        <td className="border border-black p-1 font-medium text-right">{toNum(receiptData.oFinalTotal).toFixed(2)}</td>
                        <td className="border border-black p-1 font-medium text-right">{toNum(receiptData.jodFinalTotal).toFixed(2)}</td>
                        <td className="border border-black p-1 font-medium text-right">{toNum(receiptData.koFinalTotal).toFixed(2)}</td>
                        <td colSpan="2" className="border border-black p-1"></td>
                    </tr>
                </tbody>
            </table>
        </div>

        {/* --- Footer --- */}
        <div className="flex justify-between mt-4 text-xs">
            <div className="w-1/2 mr-2 p-2 border border-black rounded-md space-y-1">
                <div className="flex justify-between"><span>जमा:-</span><span className="font-semibold">{toNum(receiptData.jama).toFixed(2)}</span></div>
                <div className="flex justify-between"><span>टो:-</span><span className="font-semibold">{toNum(receiptData.jamaTotal).toFixed(2)}</span></div>
            </div>
            <div className="w-1/2 ml-2 p-2 border border-black rounded-md space-y-1">
                <div className="flex justify-between"><span>आड:-</span><span>{toNum(receiptData.advanceAmount).toFixed(2)}</span></div>
                <div className="flex justify-between"><span>कटिंग:-</span><span>{toNum(receiptData.cuttingAmount).toFixed(2)}</span></div>
                <div className="flex justify-between"><span>टो:-</span><span className="font-semibold">{toNum(receiptData.totalWithAdvance).toFixed(2)}</span></div>
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
  
  const printRef = useRef();
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  const fetchReceipts = useCallback(async () => {
    if (!token) {
      setLoading(false);
      toast.error("Authentication error. Please log in again.");
      return;
    }
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URI}/api/receipts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const sortedReceipts = (res.data.receipts || []).sort((a, b) => new Date(b.date) - new Date(a.date));
      setReceipts(sortedReceipts);
    } catch (err) {
      console.error("Error fetching receipts:", err);
      toast.error(err.response?.data?.message || "Failed to fetch receipts.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

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

  const handleEdit = (receiptId) => {
    navigate(`/vendor/update-receipt/${receiptId}`);
  };

  const handlePrint = (receipt) => {
    setReceiptToPrint(receipt);
    setTimeout(() => {
        window.print();
        setReceiptToPrint(null);
    }, 100);
  };

  const receiptsWithDisplaySrNo = receipts.map((receipt, index) => ({
    ...receipt,
    displaySrNo: index + 1,
  }));

  const filteredReceipts = receiptsWithDisplaySrNo.filter((receipt) => {
    const searchTerm = search.toLowerCase();
    return (
      receipt.customerName.toLowerCase().includes(searchTerm) ||
      receipt.displaySrNo.toString().includes(searchTerm)
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
            .printable-area { position: absolute; left: 0; top: 0; width: 100%; }
            .print-hidden { display: none; }
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
                      <td className="py-4 px-4 text-sm font-bold text-gray-800 w-16">{receipt.displaySrNo}</td>
                      <td className="py-4 px-4 text-sm text-gray-800">{receipt.customerName}</td>
                      <td className="py-4 px-4 text-sm text-gray-500">{dayjs(receipt.date).format("DD-MM-YYYY")}</td>
                      <td className="py-4 px-4 text-sm text-gray-800 font-semibold">₹{toNum(receipt.finalTotal).toFixed(2)}</td>
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

