import React, { useState, useEffect, useRef } from "react";
import dayjs from "dayjs";
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);
import { FaEdit, FaTrashAlt, FaPrint } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";

const API_BASE_URI = "https://game-book.onrender.com";

const ReceiptForm = ({ businessName }) => {
  const [formData, setFormData] = useState(() => {
    const savedData = localStorage.getItem("receiptData");
    return savedData
      ? JSON.parse(savedData)
      : {
        _id: null,
        businessName: businessName || "आपले दुकान",
        serialNo: "",
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
      };
  });

  const [customerList, setCustomerList] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const printRef = useRef();
  const token = localStorage.getItem("token");

  // Fetch customers with detailed error logging
  useEffect(() => {
    const fetchCustomers = async () => {
      if (!token) {
        toast.error("You are not logged in.");
        return;
      }
      try {
        const response = await axios.get(`${API_BASE_URI}/api/customers`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCustomerList(response.data.customers || []);
        if (!response.data.customers || response.data.customers.length === 0) {
          toast.info("No customers found. Please add a customer first.");
        }
      } catch (error) {
        toast.error("Failed to fetch customer data.");
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
        const response = await axios.get(`${API_BASE_URI}/api/receipts`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setReceipts(response.data.receipts || []);
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

  const handleSerialNoChange = (e) => {
    const { value } = e.target;
    const selectedCustomer = customerList.find((c) => c.srNo?.toString() === value);
    setFormData((prev) => ({
      ...prev,
      serialNo: value,
      customerId: selectedCustomer?._id || "",
      customerName: selectedCustomer?.name || "",
      customerAddress: selectedCustomer?.address || "",
      customerContactNo: selectedCustomer?.contact || "",
      pendingAmount: selectedCustomer?.pendingAmount || "",
    }));
  };

  // Live calculations
  const morningIncome = Number(formData.morningIncome) || 0;
  const eveningIncome = Number(formData.eveningIncome) || 0;
  const totalIncome = morningIncome + eveningIncome;
  const deduction = totalIncome * 0.1;
  const afterDeduction = totalIncome - deduction;
  const payment = Number(formData.payment) || 0;
  const pendingAmount = Number(formData.pendingAmount) || 0;
  const advanceAmount = Number(formData.advanceAmount) || 0;
  const cuttingAmount = Number(formData.cuttingAmount) || 0;
  const remainingBalance = afterDeduction - payment;
  const finalTotal = remainingBalance + pendingAmount;
  const totalWithAdvance = (deduction + payment + cuttingAmount) + advanceAmount;

  // Calculations for "ओ., जोड, को., पान" columns
  const morningCalculations = {
    o: (Number(formData.morningO) || 0) * 8,
    jod: (Number(formData.morningJod) || 0) * 80,
    ko: (Number(formData.morningKo) || 0) * 8,
    pan: 100,
  };

  const eveningCalculations = {
    o: (Number(formData.eveningO) || 0) * 9,
    jod: (Number(formData.eveningJod) || 0) * 90,
    ko: (Number(formData.eveningKo) || 0) * 9,
    pan: 120,
  };

  const totalCalculatedPayment =
    morningCalculations.o +
    morningCalculations.jod +
    morningCalculations.ko +
    eveningCalculations.o +
    eveningCalculations.jod +
    eveningCalculations.ko;

  const jama = afterDeduction;
  const jamaTotal = afterDeduction + payment + advanceAmount;

  // Automatically update payment field based on totalCalculatedPayment
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      payment: totalCalculatedPayment.toFixed(2),
    }));
  }, [totalCalculatedPayment]);

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
      morningCalculations,
      eveningCalculations,
    };

    try {
      let response;
      let savedResponse;

      if (formData._id) {
        response = await axios.put(`${API_BASE_URI}/api/receipts/${formData._id}`, receiptToSend, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const updatedReceipt = response.data.receipt || response.data.data;

        setReceipts(receipts.map((r) => (r._id === updatedReceipt._id ? updatedReceipt : r)));
        toast.success("Receipt updated successfully!");
      } else {
        response = await axios.post(`${API_BASE_URI}/api/receipts`, receiptToSend, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const newReceipt = response.data.receipt || response.data.data;

        setReceipts([newReceipt, ...receipts]);
        toast.success("Receipt saved successfully!");
      }

      setFormData({
        _id: null,
        businessName: businessName || "आपले दुकान",
        serialNo: "",
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
      });
    } catch (error) {
      toast.error(error.message || "Error saving receipt");
      console.error("Detailed error saving receipt:", error);
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
        toast.error(error.message);
        console.error("Failed to delete receipt:", error);
      }
    }
  };

  const handleEdit = (id) => {
    const receiptToEdit = receipts.find((r) => r._id === id);
    const formattedReceipt = {
      ...receiptToEdit,
      date: dayjs(receiptToEdit.date).format("DD-MM-YYYY"),
    };
    setFormData(formattedReceipt);
  };

  const handlePrint = () => window.print();

  const handleTablePrint = (id) => {
    const receiptToPrint = receipts.find((r) => r._id === id);
    if (receiptToPrint) {
      const formattedReceipt = { ...receiptToPrint, date: dayjs(receiptToPrint.date).format("DD-MM-YYYY") };
      setFormData(formattedReceipt);
      setTimeout(() => handlePrint(), 100);
    }
  };

  const filteredReceipts = receipts.filter(
    (r) =>
      r.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dayjs(r.date).format("DD-MM-YYYY").includes(searchTerm) ||
      r.finalTotal.toString().includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans text-gray-800">
      <ToastContainer />
      <style>{`@media print { body * { visibility: hidden; } .printable-area, .printable-area * { visibility: visible; } .printable-area { position: absolute; left: 0; top: 0; width: 100%; border: none !important; box-shadow: none !important; } .no-print { display: none !important; } .print-only { display: block !important; } .print-inline-block { display: inline-block !important; } }`}</style>

      {/* Main Form */}
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-4">
          <input type="text" name="businessName" value={formData.businessName} onChange={handleChange} className="text-center font-bold text-xl rounded-md p-1 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div ref={printRef} className="printable-area p-4 border border-gray-400 rounded-lg">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-4 text-sm">
            {/* Customer Info */}
            <div className="flex flex-col items-start w-full sm:w-1/2 mb-4 sm:mb-0">
              <div className="flex items-center">
                <input type="text" name="serialNo" value={formData.serialNo} onChange={handleSerialNoChange} placeholder="Serial No." className="no-print p-1 w-24 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <span className="ml-2 font-semibold print-only">{formData.customerName}</span>
              </div>
              {formData.customerName && (
                <div className="mt-2 text-xs">
                  <div>Address: {formData.customerAddress}</div>
                  <div>Contact No: {formData.customerContactNo}</div>
                </div>
              )}
            </div>
            {/* Date and Day */}
            <div className="text-right w-full sm:w-1/2">
              <div>वार:- {formData.day}</div>
              <div>दि:- {formData.date}</div>
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
              <tr>
                <td className="border p-2">आ.</td>
                <td className="border p-2 text-right">
                  <input type="number" name="morningIncome" value={formData.morningIncome} onChange={handleChange} className="w-full text-right bg-transparent border-b border-gray-300 focus:outline-none" />
                </td>
                <td className="border p-2 text-right">
                  <div className="flex items-center justify-end">
                    <input type="number" name="morningO" value={formData.morningO} onChange={handleChange} className="w-16 text-right bg-transparent border-b border-gray-300 focus:outline-none" />
                    <span className="ml-1 text-xs whitespace-nowrap">*8={morningCalculations.o}</span>
                  </div>
                </td>
                <td className="border p-2 text-right">
                  <div className="flex items-center justify-end">
                    <input type="number" name="morningJod" value={formData.morningJod} onChange={handleChange} className="w-16 text-right bg-transparent border-b border-gray-300 focus:outline-none" />
                    <span className="ml-1 text-xs whitespace-nowrap">*80={morningCalculations.jod}</span>
                  </div>
                </td>
                <td className="border p-2 text-right">
                  <div className="flex items-center justify-end">
                    <input type="number" name="morningKo" value={formData.morningKo} onChange={handleChange} className="w-16 text-right bg-transparent border-b border-gray-300 focus:outline-none" />
                    <span className="ml-1 text-xs whitespace-nowrap">*8={morningCalculations.ko}</span>
                  </div>
                </td>
                <td className="border p-2">{morningCalculations.pan}</td>
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
                    <span className="ml-1 text-xs whitespace-nowrap">*9={eveningCalculations.o}</span>
                  </div>
                </td>
                <td className="border p-2 text-right">
                  <div className="flex items-center justify-end">
                    <input type="number" name="eveningJod" value={formData.eveningJod} onChange={handleChange} className="w-16 text-right bg-transparent border-b border-gray-300 focus:outline-none" />
                    <span className="ml-1 text-xs whitespace-nowrap">*90={eveningCalculations.jod}</span>
                  </div>
                </td>
                <td className="border p-2 text-right">
                  <div className="flex items-center justify-end">
                    <input type="number" name="eveningKo" value={formData.eveningKo} onChange={handleChange} className="w-16 text-right bg-transparent border-b border-gray-300 focus:outline-none" />
                    <span className="ml-1 text-xs whitespace-nowrap">*9={eveningCalculations.ko}</span>
                  </div>
                </td>
                <td className="border p-2">{eveningCalculations.pan}</td>
                <td className="border p-2"></td>
              </tr>
              <tr>
                <td className="border p-2">टो.</td>
                <td className="border p-2 text-right">{totalIncome.toFixed(2)}</td>
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
                <td className="border p-2 text-right">{afterDeduction.toFixed(2)}</td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
              </tr>
              <tr>
                <td className="border p-2">पें.</td>
                <td className="border p-2 text-right">
                  <input type="number" name="payment" value={formData.payment} onChange={handleChange} className="w-full text-right bg-transparent border-b border-gray-300 focus:outline-none" readOnly />
                </td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
              </tr>
              <tr>
                <td className="border p-2">टो.</td>
                <td className="border p-2 text-right">{remainingBalance.toFixed(2)}</td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
              </tr>
              <tr>
                <td className="border p-2">मा.</td>
                <td className="border p-2 text-right">{pendingAmount.toFixed(2)}</td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
              </tr>
              <tr>
                <td className="border p-2">टो.</td>
                <td className="border p-2 text-right">{finalTotal.toFixed(2)}</td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
              </tr>
            </tbody>
          </table>
          <div className="flex justify-between items-end mt-4">
            {/* New bordered "जमा" fields on the left */}
            <div className="w-1/2 ml-2 p-2 border border-gray-400 rounded-md">
              <div className="flex items-center justify-between text-sm">
                <span className="mr-2">जमा:-</span>
                <span className="font-bold">{jama.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between mt-2 text-sm">
                <span className="mr-2">टो:-</span>
                <span className="font-bold">{jamaTotal.toFixed(2)}</span>
              </div>
            </div>
            {/* Existing fields on the right with the new "cutting" field */}
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

        <div className="no-print flex justify-center mt-6 space-x-4">
          <button onClick={handleSave} className="px-6 py-2 bg-green-500 text-white rounded-full shadow-lg hover:bg-green-600 transition-colors">
            Save Receipt
          </button>
          <button onClick={handlePrint} className="px-6 py-2 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-colors">
            <FaPrint className="inline-block mr-2" /> Print
          </button>
          <button
            onClick={() =>
              setFormData({
                _id: null,
                businessName: businessName || "आपले दुकान",
                serialNo: "",
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
              })
            }
            className="px-6 py-2 bg-gray-500 text-white rounded-full shadow-lg hover:bg-gray-600 transition-colors"
          >
            Clear Form
          </button>
        </div>
      </div>

      {/* Saved Receipts Table */}
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
                  <td className="px-6 py-4 whitespace-nowrap">{receipt.finalTotal}</td>
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