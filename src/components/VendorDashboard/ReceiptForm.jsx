import React, { useState, useEffect, useRef, useCallback } from "react";
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

const getInitialFormData = (businessName) => ({
  _id: null,
  businessName: businessName || "Bappa Gaming",
  customerId: "",
  customerName: "",
  customerCompany: "",
  customerAddress: "",
  customerContactNo: "",
  day: dayjs().format("dddd"),
  date: dayjs().format("DD-MM-YYYY"),
  payment: "",
  pendingAmount: "",
  advanceAmount: "",
  cuttingAmount: "",
});

// Pan is now a direct property of the row, not in multipliers
const initialGameRows = [
    { id: 1, type: 'आ.', income: '', o: '', jod: '', ko: '', pan: '100', gun: 'SP', multipliers: { o: 8, jod: 80, ko: 8 } },
    { id: 2, type: 'कु.', income: '', o: '', jod: '', ko: '', pan: '120', gun: 'SP', multipliers: { o: 9, jod: 90, ko: 9 } }
];


const ReceiptForm = ({ businessName }) => {
  const [formData, setFormData] = useState(() => getInitialFormData(businessName));
  const [gameRows, setGameRows] = useState(initialGameRows);
  
  // New state for the Open/Close input boxes
  const [openCloseValues, setOpenCloseValues] = useState({
    open: '',
    close1: '',
    close2: ''
  });

  const [customerList, setCustomerList] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const printRef = useRef();
  const token = localStorage.getItem("token");

  const clearForm = useCallback(() => {
    setFormData(getInitialFormData(formData.businessName));
    setGameRows(initialGameRows);
    setOpenCloseValues({ open: '', close1: '', close2: ''}); // Clear open/close values
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
    setFormData((prev) => ({
      ...prev,
      customerId: selectedCustomer?._id || "",
      customerName: selectedCustomer?.name || "",
      customerAddress: selectedCustomer?.address || "",
      customerContactNo: selectedCustomer?.contact || "",
    }));
  };

  // Handler for the new Open/Close inputs
  const handleOpenCloseChange = (e) => {
    const { name, value } = e.target;
    setOpenCloseValues(prev => ({ ...prev, [name]: value }));
  };

  const handleRowChange = (index, e) => {
      const { name, value } = e.target;
      const updatedRows = [...gameRows];
      updatedRows[index] = { ...updatedRows[index], [name]: value };
      setGameRows(updatedRows);
  };

  const addRow = () => {
      if (gameRows.length < 10) {
          const newRow = {
              id: Date.now(),
              type: 'जा.',
              income: '', o: '', jod: '', ko: '', pan: '', gun: 'SP',
              multipliers: { o: 9, jod: 90, ko: 9 }
          };
          setGameRows([...gameRows, newRow]);
      } else {
          toast.warn("You can add a maximum of 10 rows.");
      }
  };

  const removeRow = (index) => {
      if (gameRows.length > 2) {
          const updatedRows = gameRows.filter((_, i) => i !== index);
          setGameRows(updatedRows);
      }
  };

  const toNum = (value) => Number(value) || 0;
  
  const totalIncome = gameRows.reduce((sum, row) => sum + toNum(row.income), 0);
  const payment = gameRows.reduce((sum, row) => {
      const oPayment = toNum(row.o) * row.multipliers.o;
      const jodPayment = toNum(row.jod) * row.multipliers.jod;
      const koPayment = toNum(row.ko) * row.multipliers.ko;
      return sum + oPayment + jodPayment + koPayment;
  }, 0);

  const deduction = totalIncome * 0.1;
  const afterDeduction = totalIncome - deduction;
  const pendingAmount = toNum(formData.pendingAmount);
  const advanceAmount = toNum(formData.advanceAmount);
  const cuttingAmount = toNum(formData.cuttingAmount);
  const remainingBalance = afterDeduction - payment;
  const finalTotal = remainingBalance + pendingAmount;
  const totalWithAdvance = deduction + payment + cuttingAmount + advanceAmount;
  const jama = afterDeduction;
  const jamaTotal = afterDeduction + payment + advanceAmount;

  useEffect(() => {
    setFormData((prev) => ({ ...prev, payment: payment.toFixed(2) }));
  }, [payment]);

  const handleSave = async () => {
    if (!formData.customerId) {
      toast.error("Please select a customer.");
      return;
    }
    const receiptToSend = {
      ...formData,
      openCloseValues, // Add the new open/close values
      gameRows: gameRows.map(({multipliers, ...row}) => row),
      date: dayjs(formData.date, "DD-MM-YYYY").toISOString(),
      totalIncome, deduction, afterDeduction, payment, remainingBalance, finalTotal,
      totalWithAdvance, pendingAmount, advanceAmount, cuttingAmount,
    };

    try {
      if (formData._id) {
        const res = await axios.put(
          `${API_BASE_URI}/api/receipts/${formData._id}`,
          receiptToSend,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setReceipts(
          receipts.map((r) =>
            r._id === res.data.receipt._id ? res.data.receipt : r
          )
        );
        toast.success("Receipt updated!");
      } else {
        const res = await axios.post(
          `${API_BASE_URI}/api/receipts`,
          receiptToSend,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setReceipts([res.data.receipt, ...receipts]);
        toast.success("Receipt saved!");
      }
      clearForm();
    } catch (error) {
      toast.error(error.response?.data?.message || "Error saving receipt");
    }
  };

  const handleEdit = (id) => {
    const receipt = receipts.find((r) => r._id === id);
    if (!receipt) return;
    const customer = customerList.find((c) => c._id === receipt.customerId);
    
    let rowsToSet = initialGameRows;
    if (receipt.gameRows && receipt.gameRows.length > 0) {
        rowsToSet = receipt.gameRows.map(row => ({
            ...row,
            multipliers: row.type === 'आ.' ? initialGameRows[0].multipliers : initialGameRows[1].multipliers
        }));
    }

    setFormData({
      ...getInitialFormData(receipt.businessName),
      ...receipt,
      _id: receipt._id,
      customerCompany: receipt.customerCompany || customer?.company || "",
      customerAddress: customer?.address || "",
      customerContactNo: customer?.contact || "",
      date: dayjs(receipt.date).format("DD-MM-YYYY"),
    });

    setGameRows(rowsToSet);
    // Set open/close values if they exist on the receipt
    setOpenCloseValues(receipt.openCloseValues || { open: '', close1: '', close2: ''});
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
      }
    }
  };

  const handlePrint = () => window.print();
  const handleTablePrint = (id) => {
    handleEdit(id);
    setTimeout(() => handlePrint(), 200);
  };
  const filteredReceipts = receipts.filter((r) =>
    r.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8 font-sans">
      <ToastContainer position="top-right" autoClose={3000} />
      <style>{`@media print { body * { visibility: hidden; } .printable-area, .printable-area * { visibility: visible; } .printable-area { position: absolute; left: 0; top: 0; width: 100%; border: none !important; box-shadow: none !important; margin: 0; padding: 1rem !important; } .no-print { display: none !important; } .printable-area .business-name-input, .printable-area input, .printable-area select { border: none !important; background: transparent !important; padding: 0; color: black !important; -webkit-appearance: none; -moz-appearance: none; text-align: inherit; } .printable-area select { appearance: none; } .printable-area strong { font-weight: bold !important; } }`}</style>
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl p-4 sm:p-8">
        <div
          ref={printRef}
          className="printable-area p-4 border border-gray-400 rounded-lg"
        >
          <div className="text-center mb-4">
            <input
              type="text"
              name="businessName"
              value={formData.businessName}
              onChange={handleChange}
              className="business-name-input text-center font-bold text-2xl p-1 w-full focus:outline-none"
              placeholder="Business Name"
            />
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-start mb-2 text-sm">
            <div className="w-full sm:w-2/5 mb-4 sm:mb-0">
              <div className="flex items-center mb-2 no-print">
                <strong className="mr-2">Customer:</strong>
                <select
                  name="customerId"
                  value={formData.customerId}
                  onChange={handleCustomerChange}
                  className="p-1 w-30 rounded-md border bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Customer</option>
                  {customerList.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <div>
                  <strong>Name:</strong> {formData.customerName || ""}
                </div>
                <div className="text-xs">
                  <strong>Address:</strong> {formData.customerAddress || ""}
                </div>
                <div className="text-xs">
                  <strong>Contact No:</strong>{" "}
                  {formData.customerContactNo || ""}
                </div>
              </div>
            </div>
            <div className="w-full sm:w-1/5 flex flex-col items-center mb-2">
              {/* NEW OPEN/CLOSE BOX */}
              <div className="p-2 border border-gray-500 rounded-lg w-full space-y-2 text-sm">
                <div className="flex items-center justify-between">
                    <span className="font-bold">Open:</span>
                    <input
                        type="number"
                        name="open"
                        value={openCloseValues.open}
                        onChange={handleOpenCloseChange}
                        className="w-18 text-center border border-gray-300 rounded"
                    />
                </div>
                <div className="flex items-center justify-between">
                    <span className="font-bold">Close:</span>
                    <div className="flex gap-1">
                        <input
                            type="number"
                            name="close1"
                            value={openCloseValues.close1}
                            onChange={handleOpenCloseChange}
                            className="w-9 text-center border border-gray-300 rounded"
                        />
                        <input
                            type="number"
                            name="close2"
                            value={openCloseValues.close2}
                            onChange={handleOpenCloseChange}
                            className="w-9 text-center border border-gray-300 rounded"
                        />
                    </div>
                </div>
              </div>

              <div className="mt-2 text-center text-sm flex items-center justify-center">
                <strong>Company:</strong>
                <select
                  name="customerCompany"
                  value={formData.customerCompany}
                  onChange={handleChange}
                  className="ml-2 bg-transparent border rounded p-1 text-xs"
                >
                  <option value="">Choose...</option>
                  {COMPANY_NAMES.map((company, index) => (
                    <option key={index} value={company}>
                      {company}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="w-full sm:w-2/5 text-right">
              <div>
                वार:- <span className="font-semibold">{formData.day}</span>
              </div>
              <div>
                दि:- <span className="font-semibold">{formData.date}</span>
              </div>
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
              {gameRows.map((row, index) => (
                <tr key={row.id}>
                  <td className="border p-2">{row.type}</td>
                  <td className="border p-2">
                    <input
                      type="number"
                      name="income"
                      value={row.income}
                      onChange={(e) => handleRowChange(index, e)}
                      className="w-full text-right bg-transparent border-b focus:outline-none"
                    />
                  </td>
                  <td className="border p-2">
                    <div className="flex items-center justify-end">
                      <input
                        type="number"
                        name="o"
                        value={row.o}
                        onChange={(e) => handleRowChange(index, e)}
                        className="w-14 text-right bg-transparent border-b"
                      />
                      <span className="ml-1 text-xs">
                        *{row.multipliers.o}={toNum(row.o) * row.multipliers.o}
                      </span>
                    </div>
                  </td>
                  <td className="border p-2">
                    <div className="flex items-center justify-end">
                      <input
                        type="number"
                        name="jod"
                        value={row.jod}
                        onChange={(e) => handleRowChange(index, e)}
                        className="w-14 text-right bg-transparent border-b"
                      />
                      <span className="ml-1 text-xs">
                        *{row.multipliers.jod}={toNum(row.jod) * row.multipliers.jod}
                      </span>
                    </div>
                  </td>
                  <td className="border p-2">
                    <div className="flex items-center justify-end">
                      <input
                        type="number"
                        name="ko"
                        value={row.ko}
                        onChange={(e) => handleRowChange(index, e)}
                        className="w-14 text-right bg-transparent border-b"
                      />
                      <span className="ml-1 text-xs">
                        *{row.multipliers.ko}={toNum(row.ko) * row.multipliers.ko}
                      </span>
                    </div>
                  </td>
                  {/* EDITABLE PAN FIELD */}
                  <td className="border p-2 text-center">
                    <input
                        type="number"
                        name="pan"
                        value={row.pan}
                        onChange={(e) => handleRowChange(index, e)}
                        className="w-16 text-center bg-transparent border-b"
                    />
                  </td>
                  <td className="border p-2 text-center">
                    <div className="flex items-center justify-center space-x-1">
                        <select
                            name="gun"
                            value={row.gun}
                            onChange={(e) => handleRowChange(index, e)}
                            className="bg-transparent border rounded p-1"
                        >
                            <option value="SP">SP</option>
                            <option value="DP">DP</option>
                        </select>
                        {index > 1 && (
                            <button onClick={() => removeRow(index)} className="no-print text-red-500 hover:text-red-700">
                                <FaMinus size={12}/>
                            </button>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
              <tr>
                <td className="border p-2">टो.</td>
                <td className="border p-2 text-right font-bold">
                  {totalIncome.toFixed(2)}
                </td>
                <td colSpan="5" className="border p-2"></td>
              </tr>
              <tr>
                <td className="border p-2">क.</td>
                <td className="border p-2 text-right">
                  {deduction.toFixed(2)}
                </td>
                <td colSpan="5" className="border p-2"></td>
              </tr>
              <tr>
                <td className="border p-2">टो.</td>
                <td className="border p-2 text-right font-bold">
                  {afterDeduction.toFixed(2)}
                </td>
                <td colSpan="5" className="border p-2"></td>
              </tr>
              <tr>
                <td className="border p-2">पें.</td>
                <td className="border p-2 text-right font-bold">
                  {payment.toFixed(2)}
                </td>
                <td colSpan="5" className="border p-2"></td>
              </tr>
              <tr>
                <td className="border p-2">टो.</td>
                <td className="border p-2 text-right font-bold">
                  {remainingBalance.toFixed(2)}
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
                    className="w-full text-right bg-transparent border-b focus:outline-none"
                  />
                </td>
                <td colSpan="5" className="border p-2"></td>
              </tr>
              <tr>
                <td className="border p-2">टो.</td>
                <td className="border p-2 text-right font-bold">
                  {finalTotal.toFixed(2)}
                </td>
                <td colSpan="5" className="border p-2"></td>
              </tr>
            </tbody>
          </table>

          <div className="no-print mt-2 flex justify-end">
                <button onClick={addRow} className="flex items-center px-3 py-1 bg-blue-500 text-white rounded-md shadow-sm hover:bg-blue-600 text-sm">
                    <FaPlus size={12} className="mr-1"/> Add Row
                </button>
          </div>

          <div className="flex justify-between mt-4">
            <div className="w-1/2 mr-2 p-2 border rounded-md space-y-2 text-sm">
              <div className="flex justify-between">
                <span>जमा:-</span>
                <span className="font-bold">{jama.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>टो:-</span>
                <span className="font-bold">{jamaTotal.toFixed(2)}</span>
              </div>
            </div>
            <div className="w-1/2 ml-2 p-2 border rounded-md space-y-2 text-sm">
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
                  {totalWithAdvance.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="no-print flex justify-center mt-6 space-x-4">
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
      <div className="no-print mt-8 max-w-4xl mx-auto bg-white rounded-lg shadow-xl p-8">
        <h2 className="text-2xl font-bold mb-4">Saved Receipts</h2>
        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 mb-4 rounded-md border"
        />
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs uppercase">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs uppercase">
                  Total
                </th>
                <th className="px-6 py-3 text-center text-xs uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y">
              {filteredReceipts.length > 0 ? (
                filteredReceipts.map((r) => (
                  <tr key={r._id}>
                    <td className="px-6 py-4">{r.customerName}</td>
                    <td className="px-6 py-4">
                      {dayjs(r.date).format("DD-MM-YYYY")}
                    </td>
                    <td className="px-6 py-4">{r.finalTotal && r.finalTotal.toFixed(2)}</td>
                    <td className="px-6 py-4 text-center space-x-3">
                      <button
                        onClick={() => handleEdit(r._id)}
                        className="text-blue-600"
                      >
                        <FaEdit size={18} />
                      </button>
                      <button
                        onClick={() => handleTablePrint(r._id)}
                        className="text-green-600"
                      >
                        <FaPrint size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(r._id)}
                        className="text-red-600"
                      >
                        <FaTrashAlt size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="4"
                    className="text-center py-4 text-gray-500"
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
  );
};

export default ReceiptForm;