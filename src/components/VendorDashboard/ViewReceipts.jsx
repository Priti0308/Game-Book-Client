import React, { useState, useEffect, useRef } from "react";
import dayjs from "dayjs";
import { FaEdit, FaTrashAlt, FaPrint, FaSpinner, FaSearch } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Define the base API URL
const API_BASE_URI = "https://game-book.onrender.com";

// A component to render the printable receipt view
const PrintableReceipt = React.forwardRef(({ receiptData }, ref) => {
  if (!receiptData) return null;

  return (
    <div ref={ref} className="p-8 font-sans" style={{ width: '210mm', minHeight: '297mm', margin: '0 auto', border: '1px solid #ccc', boxSizing: 'border-box' }}>
      <style>
        {`
        @media print {
          body {
            -webkit-print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
        }
        .receipt-container {
          padding: 1rem;
          border: 1px solid #000;
          border-radius: 0.5rem;
          font-size: 14px;
        }
        .receipt-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .receipt-title {
          font-size: 1.5rem;
          font-weight: bold;
          text-align: center;
          margin-bottom: 0.5rem;
        }
        .receipt-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 1rem;
        }
        .receipt-table th, .receipt-table td {
          border: 1px solid #000;
          padding: 0.5rem;
          text-align: left;
        }
        .receipt-table th {
          text-align: center;
          background-color: #f3f4f6;
        }
        .text-right {
          text-align: right;
        }
        .receipt-bottom {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        `}
      </style>
      <div className="receipt-container">
        <h3 className="receipt-title">
          {receiptData.businessName || "आपले दुकान"}
        </h3>
        <div className="receipt-header">
          <div>
            नांव:– {receiptData.customerName}
          </div>
          <div className="text-right">
            <div>वार:- {receiptData.day}</div>
            <div>दि:- {receiptData.date}</div>
          </div>
        </div>
        <table className="receipt-table">
          <thead>
            <tr>
              <th>ओ.</th>
              <th>रक्कम</th>
              <th>ओ.</th>
              <th>जोड</th>
              <th>को.</th>
              <th>पान</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>आ.</td>
              <td className="text-right">{receiptData.morningIncome}</td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td>कु.</td>
              <td className="text-right">{receiptData.eveningIncome}</td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td>टो.</td>
              <td className="text-right">{receiptData.totalIncome}</td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td>क.</td>
              <td className="text-right">{receiptData.deduction}</td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td>टो.</td>
              <td className="text-right">{receiptData.afterDeduction}</td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td>पें.</td>
              <td className="text-right">{receiptData.payment}</td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td>टो.</td>
              <td className="text-right">{receiptData.remainingBalance}</td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td>मा.</td>
              <td className="text-right">{receiptData.pendingAmount}</td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td>टो.</td>
              <td className="text-right">{receiptData.finalTotal}</td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          </tbody>
        </table>
        <div className="receipt-bottom">
          <div style={{ width: '50%', border: '1px solid #000', borderRadius: '0.25rem', height: '5rem' }}></div>
          <div style={{ width: '50%', marginLeft: '1rem', padding: '0.5rem', border: '1px solid #000', borderRadius: '0.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>आड:-</span>
              <span>{receiptData.advanceAmount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
              <span>टो:-</span>
              <span style={{ fontWeight: 'bold' }}>{receiptData.totalWithAdvance}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

const ViewReceipts = () => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [receiptToPrint, setReceiptToPrint] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const printRef = useRef();

  useEffect(() => {
    const fetchReceipts = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("Authentication token not found.");
        }

        const response = await fetch(`${API_BASE_URI}/api/receipts`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch receipts. Status: ${response.status}`);
        }

        const data = await response.json();
        setReceipts(data.receipts || []);
      } catch (err) {
        setError(err.message);
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReceipts();
  }, []);

  const handleEdit = (receiptId) => {
    // In a real application, you would navigate to a form page with the receipt data
    toast.info(`Editing receipt with ID: ${receiptId}.`);
    console.log(`Editing receipt with ID: ${receiptId}`);
    // Example: navigate(`/edit-receipt/${receiptId}`);
  };

  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setShowModal(true);
  };
  
  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URI}/api/receipts/${deleteId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete receipt. Status: ${response.status}`);
      }

      setReceipts(receipts.filter(r => r._id !== deleteId));
      toast.success("Receipt deleted successfully!");
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setShowModal(false);
      setDeleteId(null);
    }
  };

  const handlePrint = (receipt) => {
    setReceiptToPrint(receipt);
    setTimeout(() => {
      if (printRef.current) {
        window.print();
        setReceiptToPrint(null); // Clear the print view after printing
      }
    }, 100);
  };

  const filteredReceipts = receipts.filter(receipt =>
    (receipt.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) || "") ||
    (receipt.date?.includes(searchTerm) || "") ||
    (receipt.finalTotal?.toString().includes(searchTerm) || "")
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <FaSpinner className="animate-spin text-purple-500 text-6xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans text-gray-800">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
      
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center">
          <div className="bg-white p-8 rounded-lg shadow-xl">
            <h3 className="text-xl font-bold mb-4">Confirm Deletion</h3>
            <p>Are you sure you want to delete this receipt? This action cannot be undone.</p>
            <div className="flex justify-end mt-6 space-x-4">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="absolute top-0 left-0 -z-50" style={{ opacity: 0 }}>
        {receiptToPrint && <PrintableReceipt receiptData={receiptToPrint} ref={printRef} />}
      </div>
      
      <div className="no-print">
        <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-xl p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">View Receipts</h1>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name, date, or total..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-80 p-3 pl-10 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              />
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Final Total</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReceipts.length > 0 ? (
                  filteredReceipts.map((receipt) => (
                    <tr key={receipt._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{receipt.customerName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{receipt.date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{receipt.finalTotal}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium space-x-3">
                        <button
                          onClick={() => handleEdit(receipt._id)}
                          className="text-blue-600 hover:text-blue-900 transition-colors p-2 rounded-full hover:bg-gray-100"
                          title="Edit"
                        >
                          <FaEdit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handlePrint(receipt)}
                          className="text-green-600 hover:text-green-900 transition-colors p-2 rounded-full hover:bg-gray-100"
                          title="Print/PDF"
                        >
                          <FaPrint className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(receipt._id)}
                          className="text-red-600 hover:text-red-900 transition-colors p-2 rounded-full hover:bg-gray-100"
                          title="Delete"
                        >
                          <FaTrashAlt className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center py-8 text-gray-500">No receipts found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <div className="absolute top-0 left-0 -z-50" style={{ opacity: 0 }}>
        {receiptToPrint && <PrintableReceipt receiptData={receiptToPrint} ref={printRef} />}
      </div>
    </div>
  );
};

export default ViewReceipts;
