import React, { useState, useEffect, useRef } from "react";
import dayjs from "dayjs";
import { FaEdit, FaTrashAlt, FaPrint } from "react-icons/fa";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Ensure your API endpoint is correct
const API_BASE_URI = "https://game-book.onrender.com";

const ReceiptForm = ({ businessName }) => {
  const [formData, setFormData] = useState(() => {
    const savedData = localStorage.getItem("receiptData");
    return savedData
      ? JSON.parse(savedData)
      : {
          id: null,
          businessName: businessName || "आपले दुकान",
          customerId: "",
          customerName: "",
          day: dayjs().format("dddd"),
          date: dayjs().format("DD-MM-YYYY"),
          morningIncome: "",
          eveningIncome: "",
          payment: "",
          pendingAmount: "",
          advanceAmount: "",
        };
  });

  const [customerList, setCustomerList] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const printRef = useRef();
  const token = localStorage.getItem("token");

  // **FIXED: FETCH CUSTOMERS WITH DETAILED ERROR LOGGING**
  useEffect(() => {
    const fetchCustomers = async () => {
      if (!token) {
        console.error("No token found. Please log in.");
        toast.error("You are not logged in.");
        return;
      }
      try {
        console.log("Attempting to fetch customers...");
        const response = await fetch(`${API_BASE_URI}/api/customers`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          // Log the server's error message if available
          const errorBody = await response.json();
          throw new Error(errorBody.message || `HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        setCustomerList(data.customers || []);
        console.log("Successfully fetched customers:", data.customers);
        if (!data.customers || data.customers.length === 0) {
            toast.info("No customers found. Please add a customer first.");
        }
      } catch (error) {
        toast.error("Failed to fetch customer data.");
        // This console.error will show the detailed error in the browser console (F12)
        console.error("Detailed error fetching customers:", error);
      }
    };
    fetchCustomers();
  }, [token]);

  // Fetch receipts from the database
  useEffect(() => {
    const fetchReceipts = async () => {
      if (!token) return;
      try {
        const response = await fetch(`${API_BASE_URI}/api/receipts`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Failed to fetch receipts");
        const data = await response.json();
        setReceipts(data.receipts || []);
      } catch (error) {
        toast.error("Failed to load saved receipts.");
        console.error("Failed to fetch receipts:", error);
      }
    };
    fetchReceipts();
  }, [token]);

  useEffect(() => {
    localStorage.setItem("receiptData", JSON.stringify(formData));
  }, [formData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCustomerSelect = (e) => {
    const selectedId = e.target.value;
    const selectedCustomer = customerList.find((c) => c._id === selectedId);
    setFormData((prev) => ({
      ...prev,
      customerId: selectedId,
      customerName: selectedCustomer?.name || "",
    }));
  };
  
  // Live calculations
  const morningIncome = Number(formData.morningIncome) || 0;
  const eveningIncome = Number(formData.eveningIncome) || 0;
  const payment = Number(formData.payment) || 0;
  const pendingAmount = Number(formData.pendingAmount) || 0;
  const advanceAmount = Number(formData.advanceAmount) || 0;
  const totalIncome = morningIncome + eveningIncome;
  const deduction = totalIncome * 0.1;
  const afterDeduction = totalIncome - deduction;
  const remainingBalance = afterDeduction - payment;
  const finalTotal = remainingBalance + pendingAmount;
  const totalWithAdvance = (deduction + payment) + advanceAmount;

  // ReceiptForm.js

  // ✅ CORRECTED: SAVE BUTTON LOGIC
  const handleSave = async () => {
    // 1. Validation: Ensure a customer is selected
    if (!formData.customerName || !formData.customerId) {
      toast.error("Please select a customer from the dropdown list.");
      return;
    }

    // 2. Data to Send: Only send the raw user inputs.
    // The backend will handle calculations and snapshots of names.
    const receiptToSend = {
      customerId: formData.customerId,
      date: dayjs(formData.date, "DD-MM-YYYY").toISOString(),
      day: formData.day,
      morningIncome: Number(formData.morningIncome) || 0,
      eveningIncome: Number(formData.eveningIncome) || 0,
      payment: Number(formData.payment) || 0,
      pendingAmount: Number(formData.pendingAmount) || 0,
      advanceAmount: Number(formData.advanceAmount) || 0,
      
      // Send calculated values your backend expects
      totalIncome: totalIncome.toFixed(2),
      deduction: deduction.toFixed(2),
      afterDeduction: afterDeduction.toFixed(2),
      remainingBalance: remainingBalance.toFixed(2),
      finalTotal: finalTotal.toFixed(2),
      totalWithAdvance: totalWithAdvance.toFixed(2)
    };

    try {
      const response = await fetch(`${API_BASE_URI}/api/receipts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(receiptToSend),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to save receipt. Status: ${response.status}`);
      }

      const savedResponse = await response.json();

      // 3. Response Handling: Use the 'receipt' key from the controller's response
      // This was the main point of failure.
      setReceipts([savedResponse.receipt, ...receipts]);
      toast.success("Receipt saved successfully!");

      // Reset form
      setFormData({
        id: null, businessName: businessName || "आपले दुकान", customerId: "", customerName: "",
        day: dayjs().format("dddd"), date: dayjs().format("DD-MM-YYYY"), morningIncome: "",
        eveningIncome: "", payment: "", pendingAmount: "", advanceAmount: "",
      });

    } catch (error) {
      toast.error(error.message);
      console.error("Detailed error saving receipt:", error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this receipt?")) {
        try {
            const response = await fetch(`${API_BASE_URI}/api/receipts/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error((await response.json()).message || 'Failed to delete');
            setReceipts(receipts.filter((r) => r._id !== id));
            toast.success("Receipt deleted successfully!");
        } catch (error) {
            toast.error(error.message);
            console.error('Failed to delete receipt:', error);
        }
    }
  };

  const handleEdit = (id) => {
    const receiptToEdit = receipts.find((r) => r._id === id);
    const formattedReceipt = {
        ...receiptToEdit,
        date: dayjs(receiptToEdit.date).format('DD-MM-YYYY')
    };
    setFormData(formattedReceipt);
    toast.info("Editing receipt. Click 'Save' to create a new entry with changes.");
  };
  
  const handlePrint = () => window.print();

  const handleTablePrint = (id) => {
    const receiptToPrint = receipts.find((r) => r._id === id);
    if (receiptToPrint) {
      const formattedReceipt = { ...receiptToPrint, date: dayjs(receiptToPrint.date).format('DD-MM-YYYY') };
      setFormData(formattedReceipt);
      setTimeout(() => handlePrint(), 100);
    }
  };

  const filteredReceipts = receipts.filter((r) =>
    r.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dayjs(r.date).format('DD-MM-YYYY').includes(searchTerm) ||
    r.finalTotal.toString().includes(searchTerm)
  );

  // --- JSX / RENDERED OUTPUT (No changes needed here) ---
  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans text-gray-800">
        <style>{`@media print { body * { visibility: hidden; } .printable-area, .printable-area * { visibility: visible; } .printable-area { position: absolute; left: 0; top: 0; width: 100%; border: none !important; box-shadow: none !important; } .no-print { display: none !important; } }`}</style>

        {/* Main Form */}
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl p-8">
            <div className="text-center mb-4">
                <input type="text" name="businessName" value={formData.businessName} onChange={handleChange} className="text-center font-bold text-xl rounded-md p-1 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            
            <div ref={printRef} className="printable-area p-4 border border-gray-400 rounded-lg">
                <div className="flex justify-between items-center mb-4 text-sm">
                    <div className="flex items-center">
                        <span className="mr-2">नांव:–</span>
                        <select name="customerId" value={formData.customerId} onChange={handleCustomerSelect} className="no-print p-1 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">निवडा</option>
                            {customerList.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                        </select>
                        <span className="ml-2 font-semibold">{formData.customerName}</span>
                    </div>
                    <div className="text-right">
                        <div>वार:- {formData.day}</div>
                        <div>दि:- {formData.date}</div>
                    </div>
                </div>
                {/* The rest of the table and form inputs... */}
                <table className="w-full text-sm border-collapse">
                    {/* Table Head */}
                    <thead><tr className="bg-gray-100"><th className="border p-2 text-center">ओ.</th><th className="border p-2 text-center">रक्कम</th><th className="border p-2 text-center">ओ.</th><th className="border p-2 text-center">जोड</th><th className="border p-2 text-center">को.</th><th className="border p-2 text-center">पान</th></tr></thead>
                    {/* Table Body */}
                    <tbody>
                        <tr><td className="border p-2">आ.</td><td className="border p-2 text-right"><input type="number" name="morningIncome" value={formData.morningIncome} onChange={handleChange} className="w-full text-right bg-transparent border-b border-gray-300 focus:outline-none"/></td><td className="border p-2"></td><td className="border p-2"></td><td className="border p-2"></td><td className="border p-2"></td></tr>
                        <tr><td className="border p-2">कु.</td><td className="border p-2 text-right"><input type="number" name="eveningIncome" value={formData.eveningIncome} onChange={handleChange} className="w-full text-right bg-transparent border-b border-gray-300 focus:outline-none"/></td><td className="border p-2"></td><td className="border p-2"></td><td className="border p-2"></td><td className="border p-2"></td></tr>
                        <tr><td className="border p-2">टो.</td><td className="border p-2 text-right">{totalIncome.toFixed(2)}</td><td className="border p-2"></td><td className="border p-2"></td><td className="border p-2"></td><td className="border p-2"></td></tr>
                        <tr><td className="border p-2">क.</td><td className="border p-2 text-right">{deduction.toFixed(2)}</td><td className="border p-2"></td><td className="border p-2"></td><td className="border p-2"></td><td className="border p-2"></td></tr>
                        <tr><td className="border p-2">टो.</td><td className="border p-2 text-right">{afterDeduction.toFixed(2)}</td><td className="border p-2"></td><td className="border p-2"></td><td className="border p-2"></td><td className="border p-2"></td></tr>
                        <tr><td className="border p-2">पें.</td><td className="border p-2 text-right"><input type="number" name="payment" value={formData.payment} onChange={handleChange} className="w-full text-right bg-transparent border-b border-gray-300 focus:outline-none"/></td><td className="border p-2"></td><td className="border p-2"></td><td className="border p-2"></td><td className="border p-2"></td></tr>
                        <tr><td className="border p-2">टो.</td><td className="border p-2 text-right">{remainingBalance.toFixed(2)}</td><td className="border p-2"></td><td className="border p-2"></td><td className="border p-2"></td><td className="border p-2"></td></tr>
                        <tr><td className="border p-2">मा.</td><td className="border p-2 text-right"><input type="number" name="pendingAmount" value={formData.pendingAmount} onChange={handleChange} className="w-full text-right bg-transparent border-b border-gray-300 focus:outline-none"/></td><td className="border p-2"></td><td className="border p-2"></td><td className="border p-2"></td><td className="border p-2"></td></tr>
                        <tr><td className="border p-2">टो.</td><td className="border p-2 text-right">{finalTotal.toFixed(2)}</td><td className="border p-2"></td><td className="border p-2"></td><td className="border p-2"></td><td className="border p-2"></td></tr>
                    </tbody>
                </table>
                <div className="flex justify-between items-end mt-4">
                    <div className="w-1/2 p-2 border border-gray-400 rounded-md h-20"></div>
                    <div className="w-1/2 ml-2 p-2 border border-gray-400 rounded-md">
                        <div className="flex items-center justify-between"><span className="mr-2">आड:-</span><input type="number" name="advanceAmount" value={formData.advanceAmount} onChange={handleChange} className="flex-grow text-right bg-transparent border-b border-gray-300 focus:outline-none"/></div>
                        <div className="flex items-center justify-between mt-2"><span>टो:-</span><span className="font-bold">{totalWithAdvance.toFixed(2)}</span></div>
                    </div>
                </div>
            </div>

            <div className="no-print flex justify-center mt-6 space-x-4">
                <button onClick={handleSave} className="px-6 py-2 bg-green-500 text-white rounded-full shadow-lg hover:bg-green-600 transition-colors">Save Receipt</button>
                <button onClick={handlePrint} className="px-6 py-2 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-colors"><FaPrint className="inline-block mr-2"/> Print</button>
                <button onClick={() => setFormData({ id: null, businessName: businessName || "आपले दुकान", customerId: "", customerName: "", day: dayjs().format("dddd"), date: dayjs().format("DD-MM-YYYY"), morningIncome: "", eveningIncome: "", payment: "", pendingAmount: "", advanceAmount: "" })} className="px-6 py-2 bg-gray-500 text-white rounded-full shadow-lg hover:bg-gray-600 transition-colors">Clear Form</button>
            </div>
        </div>

        {/* Saved Receipts Table */}
        <div className="no-print mt-8 max-w-4xl mx-auto bg-white rounded-lg shadow-xl p-8">
            <h2 className="text-2xl font-bold mb-4">Saved Receipts</h2>
            <div className="mb-4"><input type="text" placeholder="Search receipts..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer Name</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Final Total</th><th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th></tr></thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredReceipts.map((receipt) => (
                            <tr key={receipt._id}><td className="px-6 py-4 whitespace-nowrap">{receipt.customerName}</td><td className="px-6 py-4 whitespace-nowrap">{dayjs(receipt.date).format("DD-MM-YYYY")}</td><td className="px-6 py-4 whitespace-nowrap">{receipt.finalTotal}</td><td className="px-6 py-4 whitespace-nowrap text-center space-x-2"><button onClick={() => handleEdit(receipt._id)} className="text-blue-600 hover:text-blue-900"><FaEdit className="w-5 h-5 inline-block"/></button><button onClick={() => handleTablePrint(receipt._id)} className="text-green-600 hover:text-green-900"><FaPrint className="w-5 h-5 inline-block"/></button><button onClick={() => handleDelete(receipt._id)} className="text-red-600 hover:text-red-900"><FaTrashAlt className="w-5 h-5 inline-block"/></button></td></tr>
                        ))}
                        {filteredReceipts.length === 0 && (<tr><td colSpan="4" className="text-center py-4 text-gray-500">No receipts found.</td></tr>)}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};

export default ReceiptForm;