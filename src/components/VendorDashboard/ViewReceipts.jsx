import React, { useState, useEffect, useCallback, useRef } from "react";
import dayjs from "dayjs";
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { FaTrashAlt, FaPrint, FaSpinner, FaSearch } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import axios from "axios";

dayjs.extend(customParseFormat);

const API_BASE_URI = "https://game-book.onrender.com";

// A component to render the printable receipt view, styled like ReceiptForm.jsx
const PrintableReceipt = React.forwardRef(({ receiptData }, ref) => {
  if (!receiptData) return null;

  return (
    <div ref={ref} className="printable-area p-8 font-sans bg-white" style={{ width: '210mm', minHeight: '297mm', margin: '0 auto', boxSizing: 'border-box' }}>
        <div className="text-center mb-4">
          <h2 className="text-center font-bold text-xl">{receiptData.businessName || "आपले दुकान"}</h2>
        </div>
        <div className="flex justify-between items-center mb-4 text-sm">
          <div className="flex items-center">
            <span className="mr-2">नांव:–</span>
            <span className="font-semibold">{receiptData.customerName}</span>
          </div>
          <div className="text-right">
            <div>वार:- {receiptData.day}</div>
            <div>दि:- {dayjs(receiptData.date).format("DD-MM-YYYY")}</div>
          </div>
        </div>
        <table className="w-full text-sm border-collapse border border-black">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-black p-2 text-center">ओ.</th>
              <th className="border border-black p-2 text-center">रक्कम</th>
              <th className="border border-black p-2 text-center">ओ.</th>
              <th className="border border-black p-2 text-center">जोड</th>
              <th className="border border-black p-2 text-center">को.</th>
              <th className="border border-black p-2 text-center">पान</th>
            </tr>
          </thead>
          <tbody>
            <tr><td className="border border-black p-2">आ.</td><td className="border border-black p-2 text-right">{receiptData.morningIncome}</td><td colSpan="4" className="border border-black p-2"></td></tr>
            <tr><td className="border border-black p-2">कु.</td><td className="border border-black p-2 text-right">{receiptData.eveningIncome}</td><td colSpan="4" className="border border-black p-2"></td></tr>
            <tr><td className="border border-black p-2">टो.</td><td className="border border-black p-2 text-right">{receiptData.totalIncome}</td><td colSpan="4" className="border border-black p-2"></td></tr>
            <tr><td className="border border-black p-2">क.</td><td className="border border-black p-2 text-right">{receiptData.deduction}</td><td colSpan="4" className="border border-black p-2"></td></tr>
            <tr><td className="border border-black p-2">टो.</td><td className="border border-black p-2 text-right">{receiptData.afterDeduction}</td><td colSpan="4" className="border border-black p-2"></td></tr>
            <tr><td className="border border-black p-2">पें.</td><td className="border border-black p-2 text-right">{receiptData.payment}</td><td colSpan="4" className="border border-black p-2"></td></tr>
            <tr><td className="border border-black p-2">टो.</td><td className="border border-black p-2 text-right">{receiptData.remainingBalance}</td><td colSpan="4" className="border border-black p-2"></td></tr>
            <tr><td className="border border-black p-2">मा.</td><td className="border border-black p-2 text-right">{receiptData.pendingAmount}</td><td colSpan="4" className="border border-black p-2"></td></tr>
            <tr><td className="border border-black p-2">टो.</td><td className="border border-black p-2 text-right font-bold">{receiptData.finalTotal}</td><td colSpan="4" className="border border-black p-2"></td></tr>
          </tbody>
        </table>
        <div className="flex justify-between items-end mt-4">
          <div className="w-1/2 p-2 border border-black rounded-md h-20"></div>
          <div className="w-1/2 ml-2 p-2 border border-black rounded-md">
            <div className="flex items-center justify-between"><span>आड:-</span><span>{receiptData.advanceAmount}</span></div>
            <div className="flex items-center justify-between mt-2"><span>टो:-</span><span className="font-bold">{receiptData.totalWithAdvance}</span></div>
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

  const handlePrint = (receipt) => {
    setReceiptToPrint(receipt);
    setTimeout(() => {
      if (printRef.current) {
        window.print();
        setReceiptToPrint(null);
      }
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
      <div className="absolute top-0 left-0 -z-10 opacity-0 print:z-auto print:opacity-100">
          {receiptToPrint && <PrintableReceipt receiptData={receiptToPrint} ref={printRef} />}
      </div>
       <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            .printable-area, .printable-area * {
              visibility: visible;
            }
            .printable-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              height: 100%;
              margin: 0;
              padding: 0;
              border: none;
            }
            .no-print {
              display: none;
            }
          }
        `}
      </style>
      <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8 no-print">
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
                      <td className="py-4 px-4 text-sm text-gray-800 font-semibold">₹{receipt.finalTotal}</td>
                      <td className="py-4 px-4 text-sm">
                        <div className="flex gap-4">
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

