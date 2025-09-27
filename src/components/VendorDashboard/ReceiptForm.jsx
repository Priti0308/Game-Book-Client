import React, { useState, useEffect, useRef, useCallback } from "react";
import dayjs from "dayjs";
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);
import { FaEdit, FaTrashAlt, FaPrint } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";

const API_BASE_URI = "https://game-book.onrender.com";

const ReceiptForm = ({ businessName }) => {
  // Initial state setup
  const [formData, setFormData] = useState(() => {
    const savedData = localStorage.getItem("receiptData");
    return savedData
      ? JSON.parse(savedData)
      : {
          _id: null,
          businessName: businessName || "आपले दुकान",
          serialNo: "",
          customerId: "",
          customerName: "",
          customerAddress: "",
          customerContactNo: "",
          day: dayjs().format("dddd"),
          date: dayjs().format("DD-MM-YYYY"),
          morningIncome: "",
          eveningIncome: "",
          payment: "", // This will be calculated, initialized to empty
          pendingAmount: "", // Manual input
          advanceAmount: "", // Manual input
          cuttingAmount: "", // Manual input
          morningO: "",
          morningJod: "",
          morningKo: "",
          eveningO: "",
          eveningJod: "",
          eveningKo: "",
        };
  });

  const [customerList, setCustomerList] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const printRef = useRef();
  const token = localStorage.getItem("token");

  // Fetch customers
  const fetchCustomers = useCallback(async () => {
    if (!token) {
      toast.error("You are not logged in.");
      return;
    }
    try {
      const response = await axios.get(`${API_BASE_URI}/api/customers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Ensure srNo is treated as string for consistent matching
      const customers = (response.data.customers || []).map(c => ({
        ...c,
        srNo: c.srNo?.toString(),
      }));
      setCustomerList(customers);
    } catch (error) {
      toast.error("Failed to fetch customer data.");
      console.error("Detailed error fetching customers:", error);
    }
  }, [token]);

  // Fetch receipts from the database
  const fetchReceipts = useCallback(async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API_BASE_URI}/api/receipts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReceipts(response.data.receipts || []);
    } catch (error) {
      toast.error("Failed to load saved receipts.");
      console.error("Failed to fetch receipts:", error);
    }
  }, [token]);

  useEffect(() => {
    fetchCustomers();
    fetchReceipts();
  }, [fetchCustomers, fetchReceipts]);

  // Save formData to localStorage on change
  useEffect(() => {
    localStorage.setItem("receiptData", JSON.stringify(formData));
  }, [formData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * IMPORTANT: Improved logic for serial number change.
   * Fetches customer details based on srNo and populates the form.
   */
  const handleSerialNoChange = (e) => {
    const value = e.target.value.trim();
    
    // Find customer by comparing the input value (string) with the customer's srNo (string)
    const selectedCustomer = customerList.find((c) => c.srNo === value);
    
    // Update formData with new serialNo and customer details
    setFormData((prev) => ({
      ...prev,
      serialNo: value,
      // Reset or set customer details based on whether a customer was found
      customerId: selectedCustomer?._id || "",
      customerName: selectedCustomer?.name || "",
      customerAddress: selectedCustomer?.address || "",
      customerContactNo: selectedCustomer?.contact || "",
      // NOTE: pendingAmount is *not* fetched from customer data as it's ledger data.
      // It remains as whatever the user last entered or its initial state.
    }));
  };

  // --- CALCULATIONS ---

  const toNum = (value) => Number(value) || 0;

  const morningIncome = toNum(formData.morningIncome);
  const eveningIncome = toNum(formData.eveningIncome);
  const totalIncome = morningIncome + eveningIncome;
  const deduction = totalIncome * 0.1;
  const afterDeduction = totalIncome - deduction;
  
  const pendingAmount = toNum(formData.pendingAmount);
  const advanceAmount = toNum(formData.advanceAmount);
  const cuttingAmount = toNum(formData.cuttingAmount);

  // Calculations for "ओ., जोड, को., पान" columns
  const morningCalculations = {
    o: toNum(formData.morningO) * 8,
    jod: toNum(formData.morningJod) * 80,
    ko: toNum(formData.morningKo) * 8,
    pan: 100, // Static value
  };

  const eveningCalculations = {
    o: toNum(formData.eveningO) * 9,
    jod: toNum(formData.eveningJod) * 90,
    ko: toNum(formData.eveningKo) * 9,
    pan: 120, // Static value
  };
  
  // Total calculated payment based on the O., Jod, Ko columns
  const totalCalculatedPayment =
    morningCalculations.o +
    morningCalculations.jod +
    morningCalculations.ko +
    eveningCalculations.o +
    eveningCalculations.jod +
    eveningCalculations.ko;

  const payment = totalCalculatedPayment; // Payment is derived from calculations

  const remainingBalance = afterDeduction - payment;
  const finalTotal = remainingBalance + pendingAmount;
  const totalWithAdvance = (deduction + payment + cuttingAmount) + advanceAmount;

  const jama = afterDeduction;
  const jamaTotal = afterDeduction + payment + advanceAmount;

  // Sync the calculated payment back to the state (read-only in form)
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      payment: payment.toFixed(2), // Keep the state synced with the calculation
    }));
  }, [payment]);


  // --- CRUD OPERATIONS ---

  const handleSave = async () => {
    if (!formData.customerName || !formData.customerId) {
      toast.error("Please select a customer by entering the serial number.");
      return;
    }

    const receiptToSend = {
      businessName: formData.businessName,
      customerName: formData.customerName,
      customerId: formData.customerId,
      date: dayjs(formData.date, "DD-MM-YYYY").toISOString(),
      day: formData.day,
      morningIncome: morningIncome,
      eveningIncome: eveningIncome,
      payment: payment,
      pendingAmount: pendingAmount,
      advanceAmount: advanceAmount,
      cuttingAmount: cuttingAmount,
      totalIncome: totalIncome,
      deduction: deduction,
      afterDeduction: afterDeduction,
      remainingBalance: remainingBalance,
      finalTotal: finalTotal,
      totalWithAdvance: totalWithAdvance,
      // Sending raw values to match the schema structure from the original component
      morningO: toNum(formData.morningO),
      morningJod: toNum(formData.morningJod),
      morningKo: toNum(formData.morningKo),
      eveningO: toNum(formData.eveningO),
      eveningJod: toNum(formData.eveningJod),
      eveningKo: toNum(formData.eveningKo),
    };

    try {
      let response;
      if (formData._id) {
        // Update existing receipt
        response = await axios.put(`${API_BASE_URI}/api/receipts/${formData._id}`, receiptToSend, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const updatedReceipt = response.data.receipt || response.data.data;
        setReceipts(receipts.map((r) => (r._id === updatedReceipt._id ? updatedReceipt : r)));
        toast.success("Receipt updated successfully!");
      } else {
        // Create new receipt
        response = await axios.post(`${API_BASE_URI}/api/receipts`, receiptToSend, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const newReceipt = response.data.receipt || response.data.data;
        setReceipts([newReceipt, ...receipts]);
        toast.success("Receipt saved successfully!");
      }

      // Clear form after successful save/update, keeping businessName
      setFormData((prev) => ({
        _id: null,
        businessName: prev.businessName || "आपले दुकान",
        serialNo: "",
        customerId: "",
        customerName: "",
        customerAddress: "",
        customerContactNo: "",
        day: dayjs().format("dddd"),
        date: dayjs().format("DD-MM-YYYY"),
        morningIncome: "",
        eveningIncome: "",
        payment: "",
        pendingAmount: "",
        advanceAmount: "",
        cuttingAmount: "",
        morningO: "",
        morningJod: "",
        morningKo: "",
        eveningO: "",
        eveningJod: "",
        eveningKo: "",
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || "Error saving receipt");
      console.error("Detailed error saving receipt:", error.response?.data || error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this receipt?")) {
      try {
        await axios.delete(`${API_BASE_URI}/api/receipts/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setReceipts(receipts.filter((r) => r._id !== id));
        toast.success("Receipt deleted successfully!");
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to delete receipt.");
        console.error("Failed to delete receipt:", error);
      }
    }
  };

  const handleEdit = (id) => {
    const receiptToEdit = receipts.find((r) => r._id === id);
    if (!receiptToEdit) return;

    // Find the original customer data to get serialNo, address, contact
    const originalCustomer = customerList.find(c => c._id === receiptToEdit.customerId);

    // Reconstruct the full form state
    setFormData({
      _id: receiptToEdit._id,
      businessName: receiptToEdit.businessName || businessName || "आपले दुकान",
      
      // Customer Details from CustomerList
      serialNo: originalCustomer?.srNo || "",
      customerId: receiptToEdit.customerId,
      customerName: receiptToEdit.customerName,
      customerAddress: originalCustomer?.address || "",
      customerContactNo: originalCustomer?.contact || "",

      // Receipt Details
      day: receiptToEdit.day,
      date: dayjs(receiptToEdit.date).format("DD-MM-YYYY"),
      morningIncome: receiptToEdit.morningIncome?.toString() || "",
      eveningIncome: receiptToEdit.eveningIncome?.toString() || "",
      payment: receiptToEdit.payment?.toString() || "", // This should still be the saved value
      pendingAmount: receiptToEdit.pendingAmount?.toString() || "",
      advanceAmount: receiptToEdit.advanceAmount?.toString() || "",
      cuttingAmount: receiptToEdit.cuttingAmount?.toString() || "",

      // Input fields for O., Jod, Ko - using saved values if they exist, otherwise empty string
      morningO: receiptToEdit.morningO?.toString() || "",
      morningJod: receiptToEdit.morningJod?.toString() || "",
      morningKo: receiptToEdit.morningKo?.toString() || "",
      eveningO: receiptToEdit.eveningO?.toString() || "",
      eveningJod: receiptToEdit.eveningJod?.toString() || "",
      eveningKo: receiptToEdit.eveningKo?.toString() || "",
    });
  };

  const handlePrint = () => window.print();

  const handleTablePrint = (id) => {
    const receiptToPrint = receipts.find((r) => r._id === id);
    if (receiptToPrint) {
      // Find the original customer data to get serialNo, address, contact
      const originalCustomer = customerList.find(c => c._id === receiptToPrint.customerId);

      // Temporarily update formData to reflect the receipt to be printed
      const formattedReceipt = {
        ...receiptToPrint,
        date: dayjs(receiptToPrint.date).format("DD-MM-YYYY"),
        serialNo: originalCustomer?.srNo || "",
        customerAddress: originalCustomer?.address || "",
        customerContactNo: originalCustomer?.contact || "",
        // Ensure all numeric fields are strings for input value consistency
        morningIncome: receiptToPrint.morningIncome?.toString() || "",
        eveningIncome: receiptToPrint.eveningIncome?.toString() || "",
        payment: receiptToPrint.payment?.toString() || "",
        pendingAmount: receiptToPrint.pendingAmount?.toString() || "",
        advanceAmount: receiptToPrint.advanceAmount?.toString() || "",
        cuttingAmount: receiptToPrint.cuttingAmount?.toString() || "",
        morningO: receiptToPrint.morningO?.toString() || "",
        morningJod: receiptToPrint.morningJod?.toString() || "",
        morningKo: receiptToPrint.morningKo?.toString() || "",
        eveningO: receiptToPrint.eveningO?.toString() || "",
        eveningJod: receiptToPrint.eveningJod?.toString() || "",
        eveningKo: receiptToPrint.eveningKo?.toString() || "",
      };
      setFormData(formattedReceipt);
      setTimeout(() => handlePrint(), 100);
    }
  };

  const filteredReceipts = receipts.filter(
    (r) => {
      const searchTermLower = searchTerm.toLowerCase();
      // Find the customer associated with the receipt to get their serial number
      const associatedCustomer = customerList.find(c => c._id === r.customerId);
      const serialNo = associatedCustomer?.srNo?.toString().toLowerCase();

      return (
        r.customerName.toLowerCase().includes(searchTermLower) ||
        (serialNo && serialNo.includes(searchTermLower)) ||
        dayjs(r.date).format("DD-MM-YYYY").includes(searchTerm) ||
        r.finalTotal.toString().includes(searchTerm)
      );
    }
  );

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8 font-sans text-gray-800">
      <ToastContainer />
      <style>{`@media print { 
        body * { visibility: hidden; } 
        .printable-area, .printable-area * { visibility: visible; } 
        .printable-area { position: absolute; left: 0; top: 0; width: 100%; border: none !important; box-shadow: none !important; margin: 0; padding: 0 !important; } 
        .no-print { display: none !important; } 
        .print-only { display: block !important; } 
        .print-inline-block { display: inline-block !important; } 
        .printable-area input[type="number"], .printable-area input[type="text"] {
          border: none !important;
          background: transparent !important;
          -webkit-appearance: none;
          -moz-appearance: textfield;
          text-align: inherit;
          padding: 0;
          margin: 0;
          width: 100%;
        }
        .printable-area table { table-layout: fixed; width: 100%; }
        .printable-area th, .printable-area td { padding: 4px 8px !important; }
      }`}</style>

      {/* Main Form */}
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl p-4 sm:p-8">
        <div className="text-center mb-4">
          {/* Business Name: Always visible and editable on screen, prints as text */}
          <input 
            type="text" 
            name="businessName" 
            value={formData.businessName} 
            onChange={handleChange} 
            className="text-center font-bold text-xl rounded-md p-1 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
          />
        </div>

        <div ref={printRef} className="printable-area p-4 border border-gray-400 rounded-lg">
          <div className="flex flex-col sm:flex-row justify-between items-start mb-4 text-sm">
            
            {/* Customer Info (Left Side) */}
            <div className="flex flex-col items-start w-full sm:w-1/2 mb-4 sm:mb-0">
                <div className="flex items-center mb-2">
                    {/* Serial No. Input - only visible on screen */}
                    <span className="font-semibold mr-2 no-print">Serial No:</span>
                    <input 
                        type="text" 
                        name="serialNo" 
                        value={formData.serialNo} 
                        onChange={handleSerialNoChange} 
                        placeholder="Serial No." 
                        className="no-print p-1 w-24 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                </div>
                
                {/* Customer Details - Clearly displayed for print and screen */}
                <div className="mt-1 text-base space-y-1">
                    <div className="font-bold">Customer: {formData.customerName || 'N/A'}</div>
                    <div className="text-xs">Address: {formData.customerAddress || 'N/A'}</div>
                    <div className="text-xs">Contact No: {formData.customerContactNo || 'N/A'}</div>
                </div>
            </div>

            {/* Date and Day (Right Side) */}
            <div className="text-right w-full sm:w-1/2">
              <div>वार:- <span className="font-semibold">{formData.day}</span></div>
              <div>दि:- <span className="font-semibold">{formData.date}</span></div>
            </div>
          </div>

          <table className="w-full text-sm border-collapse">
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
              {/* Income and Calculation rows */}
              <tr>
                <td className="border p-2">आ.</td>
                <td className="border p-2 text-right">
                  <input type="number" name="morningIncome" value={formData.morningIncome} onChange={handleChange} className="w-full text-right bg-transparent border-b border-gray-300 focus:outline-none" />
                </td>
                <td className="border p-2 text-right">
                  <div className="flex items-center justify-end">
                    <input type="number" name="morningO" value={formData.morningO} onChange={handleChange} className="w-16 text-right bg-transparent border-b border-gray-300 focus:outline-none" />
                    <span className="ml-1 text-xs whitespace-nowrap">*8=<span className="font-semibold print-only print-inline-block">{morningCalculations.o.toFixed(0)}</span><span className="no-print">{morningCalculations.o.toFixed(0)}</span></span>
                  </div>
                </td>
                <td className="border p-2 text-right">
                  <div className="flex items-center justify-end">
                    <input type="number" name="morningJod" value={formData.morningJod} onChange={handleChange} className="w-16 text-right bg-transparent border-b border-gray-300 focus:outline-none" />
                    <span className="ml-1 text-xs whitespace-nowrap">*80=<span className="font-semibold print-only print-inline-block">{morningCalculations.jod.toFixed(0)}</span><span className="no-print">{morningCalculations.jod.toFixed(0)}</span></span>
                  </div>
                </td>
                <td className="border p-2 text-right">
                  <div className="flex items-center justify-end">
                    <input type="number" name="morningKo" value={formData.morningKo} onChange={handleChange} className="w-16 text-right bg-transparent border-b border-gray-300 focus:outline-none" />
                    <span className="ml-1 text-xs whitespace-nowrap">*8=<span className="font-semibold print-only print-inline-block">{morningCalculations.ko.toFixed(0)}</span><span className="no-print">{morningCalculations.ko.toFixed(0)}</span></span>
                  </div>
                </td>
                <td className="border p-2 text-center">{morningCalculations.pan.toFixed(0)}</td>
                <td className="border p-2"></td>
              </tr>
              <tr>
                <td className="border p-2">कु.</td>
                <td className="border p-2 text-right">
                  <input type="number" name="eveningIncome" value={formData.eveningIncome} onChange={handleChange} className="w-full text-right bg-transparent border-b border-gray-300 focus:outline-none" />
                </td>
                <td className="border p-2 text-right">
                  <div className="flex items-center justify-end">
                    <input type="number" name="eveningO" value={formData.eveningO} onChange={handleChange} className="w-16 text-right bg-transparent border-b border-gray-300 focus:outline-none" />
                    <span className="ml-1 text-xs whitespace-nowrap">*9=<span className="font-semibold print-only print-inline-block">{eveningCalculations.o.toFixed(0)}</span><span className="no-print">{eveningCalculations.o.toFixed(0)}</span></span>
                  </div>
                </td>
                <td className="border p-2 text-right">
                  <div className="flex items-center justify-end">
                    <input type="number" name="eveningJod" value={formData.eveningJod} onChange={handleChange} className="w-16 text-right bg-transparent border-b border-gray-300 focus:outline-none" />
                    <span className="ml-1 text-xs whitespace-nowrap">*90=<span className="font-semibold print-only print-inline-block">{eveningCalculations.jod.toFixed(0)}</span><span className="no-print">{eveningCalculations.jod.toFixed(0)}</span></span>
                  </div>
                </td>
                <td className="border p-2 text-right">
                  <div className="flex items-center justify-end">
                    <input type="number" name="eveningKo" value={formData.eveningKo} onChange={handleChange} className="w-16 text-right bg-transparent border-b border-gray-300 focus:outline-none" />
                    <span className="ml-1 text-xs whitespace-nowrap">*9=<span className="font-semibold print-only print-inline-block">{eveningCalculations.ko.toFixed(0)}</span><span className="no-print">{eveningCalculations.ko.toFixed(0)}</span></span>
                  </div>
                </td>
                <td className="border p-2 text-center">{eveningCalculations.pan.toFixed(0)}</td>
                <td className="border p-2"></td>
              </tr>
              <tr>
                <td className="border p-2">टो.</td>
                <td className="border p-2 text-right font-bold">{totalIncome.toFixed(2)}</td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
              </tr>
              <tr>
                <td className="border p-2">क.</td>
                <td className="border p-2 text-right">{deduction.toFixed(2)}</td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
              </tr>
              <tr>
                <td className="border p-2">टो.</td>
                <td className="border p-2 text-right font-bold">{afterDeduction.toFixed(2)}</td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
              </tr>
              <tr>
                <td className="border p-2">पें.</td>
                <td className="border p-2 text-right">
                  <input type="number" name="payment" value={payment.toFixed(2)} readOnly className="w-full text-right bg-transparent border-b border-gray-300 focus:outline-none cursor-default" />
                </td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
              </tr>
              <tr>
                <td className="border p-2">टो.</td>
                <td className="border p-2 text-right font-bold">{remainingBalance.toFixed(2)}</td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
              </tr>
              <tr>
                <td className="border p-2">मा.</td>
                <td className="border p-2 text-right">
                  <input type="number" name="pendingAmount" value={formData.pendingAmount} onChange={handleChange} className="w-full text-right bg-transparent border-b border-gray-300 focus:outline-none" />
                </td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
              </tr>
              <tr>
                <td className="border p-2">टो.</td>
                <td className="border p-2 text-right font-bold">{finalTotal.toFixed(2)}</td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
              </tr>
            </tbody>
          </table>
          
          {/* Bottom Summary Fields */}
          <div className="flex justify-between items-end mt-4">
            <div className="w-1/2 mr-2 p-2 border border-gray-400 rounded-md">
              <div className="flex items-center justify-between text-sm">
                <span className="mr-2">जमा:-</span>
                <span className="font-bold">{jama.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between mt-2 text-sm">
                <span className="mr-2">टो:-</span>
                <span className="font-bold">{jamaTotal.toFixed(2)}</span>
              </div>
            </div>
            <div className="w-1/2 ml-2 p-2 border border-gray-400 rounded-md">
              <div className="flex items-center justify-between">
                <span className="mr-2">आड:-</span>
                <input type="number" name="advanceAmount" value={formData.advanceAmount} onChange={handleChange} className="flex-grow text-right bg-transparent border-b border-gray-300 focus:outline-none" />
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="mr-2">कटिंग:-</span>
                <input type="number" name="cuttingAmount" value={formData.cuttingAmount} onChange={handleChange} className="flex-grow text-right bg-transparent border-b border-gray-300 focus:outline-none" />
              </div>
              <div className="flex items-center justify-between mt-2">
                <span>टो:-</span>
                <span className="font-bold">{totalWithAdvance.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons (No Print) */}
        <div className="no-print flex justify-center mt-6 space-x-4">
          <button onClick={handleSave} className="px-6 py-2 bg-green-500 text-white rounded-full shadow-lg hover:bg-green-600 transition-colors">
            Save Receipt
          </button>
          <button onClick={handlePrint} className="px-6 py-2 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-colors">
            <FaPrint className="inline-block mr-2" /> Print
          </button>
          <button
            onClick={() =>
              setFormData((prev) => ({
                _id: null,
                businessName: prev.businessName || "आपले दुकान",
                serialNo: "",
                customerId: "",
                customerName: "",
                customerAddress: "",
                customerContactNo: "",
                day: dayjs().format("dddd"),
                date: dayjs().format("DD-MM-YYYY"),
                morningIncome: "",
                eveningIncome: "",
                payment: "",
                pendingAmount: "",
                advanceAmount: "",
                cuttingAmount: "",
                morningO: "",
                morningJod: "",
                morningKo: "",
                eveningO: "",
                eveningJod: "",
                eveningKo: "",
              }))
            }
            className="px-6 py-2 bg-gray-500 text-white rounded-full shadow-lg hover:bg-gray-600 transition-colors"
          >
            Clear Form
          </button>
        </div>
      </div>

      {/* Saved Receipts Table (No Print) */}
      <div className="no-print mt-8 max-w-4xl mx-auto bg-white rounded-lg shadow-xl p-8">
        <h2 className="text-2xl font-bold mb-4">Saved Receipts</h2>
        <div className="mb-4">
          <input type="text" placeholder="Search receipts..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Final Total</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReceipts.map((receipt) => (
                <tr key={receipt._id}>
                  <td className="px-6 py-4 whitespace-nowrap">{receipt.customerName}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{dayjs(receipt.date).format("DD-MM-YYYY")}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{receipt.finalTotal.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center space-x-2">
                    <button onClick={() => handleEdit(receipt._id)} className="text-blue-600 hover:text-blue-900">
                      <FaEdit className="w-5 h-5 inline-block" />
                    </button>
                    <button onClick={() => handleTablePrint(receipt._id)} className="text-green-600 hover:text-green-900">
                      <FaPrint className="w-5 h-5 inline-block" />
                    </button>
                    <button onClick={() => handleDelete(receipt._id)} className="text-red-600 hover:text-red-900">
                      <FaTrashAlt className="w-5 h-5 inline-block" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredReceipts.length === 0 && (
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