import React, { useState, useEffect, useRef, useCallback } from "react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);
import { FaEdit, FaTrashAlt, FaPrint } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";

const API_BASE_URI = "https://game-book.onrender.com";

const getInitialFormData = (businessName) => ({
  _id: null,
  businessName: businessName || "Bappa Gaming",
  serialNo: "",
  customerId: "",
  customerName: "",
  customerCompany: "",
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

const ReceiptForm = ({ businessName }) => {
  const [formData, setFormData] = useState(() =>
    getInitialFormData(businessName)
  );
  const [gameStatus, setGameStatus] = useState("Open");
  const [gameNumbers, setGameNumbers] = useState({ num1: "", num2: "" });
  const [gunOptions, setGunOptions] = useState({
    morning: "SP",
    evening: "SP",
  });
  const [customerList, setCustomerList] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const printRef = useRef();
  const token = localStorage.getItem("token");

  const clearForm = useCallback(() => {
    setFormData(getInitialFormData(formData.businessName));
    setGameStatus("Open");
    setGameNumbers({ num1: "", num2: "" });
    setGunOptions({ morning: "SP", evening: "SP" });
  }, [formData.businessName]);

  const fetchCustomers = useCallback(async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API_BASE_URI}/api/customers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const customers = (response.data.customers || [])
        .map((c) => ({ ...c, srNo: c.srNo?.toString() }))
        .sort((a, b) => parseInt(a.srNo, 10) - parseInt(b.srNo, 10));
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

  const handleSerialNoChange = (e) => {
    const value = e.target.value;
    const selectedCustomer = customerList.find((c) => c.srNo === value);
    setFormData((prev) => ({
      ...prev,
      serialNo: value,
      customerId: selectedCustomer?._id || "",
      customerName: selectedCustomer?.name || "",
      customerCompany: selectedCustomer?.company || "",
      customerAddress: selectedCustomer?.address || "",
      customerContactNo: selectedCustomer?.contact || "",
    }));
  }; // --- CALCULATIONS ---

  const toNum = (value) => Number(value) || 0;
  const morningIncome = toNum(formData.morningIncome);
  const eveningIncome = toNum(formData.eveningIncome);
  const totalIncome = morningIncome + eveningIncome;
  const deduction = totalIncome * 0.1;
  const afterDeduction = totalIncome - deduction;
  const pendingAmount = toNum(formData.pendingAmount);
  const advanceAmount = toNum(formData.advanceAmount);
  const cuttingAmount = toNum(formData.cuttingAmount);
  const morningCalculations = {
    o: toNum(formData.morningO) * 8,
    jod: toNum(formData.morningJod) * 80,
    ko: toNum(formData.morningKo) * 8,
    pan: 100,
  };
  const eveningCalculations = {
    o: toNum(formData.eveningO) * 9,
    jod: toNum(formData.eveningJod) * 90,
    ko: toNum(formData.eveningKo) * 9,
    pan: 120,
  };
  const totalCalculatedPayment =
    morningCalculations.o +
    morningCalculations.jod +
    morningCalculations.ko +
    eveningCalculations.o +
    eveningCalculations.jod +
    eveningCalculations.ko;
  const payment = totalCalculatedPayment;
  const remainingBalance = afterDeduction - payment;
  const finalTotal = remainingBalance + pendingAmount;
  const totalWithAdvance = deduction + payment + cuttingAmount + advanceAmount;
  const jama = afterDeduction;
  const jamaTotal = afterDeduction + payment + advanceAmount;
  useEffect(() => {
    setFormData((prev) => ({ ...prev, payment: payment.toFixed(2) }));
  }, [payment]); // --- CRUD OPERATIONS ---

  const handleSave = async () => {
    if (!formData.customerId) {
      toast.error("Please select a customer.");
      return;
    }
    const receiptToSend = {
      businessName: formData.businessName,
      customerName: formData.customerName,
      customerId: formData.customerId,
      date: dayjs(formData.date, "DD-MM-YYYY").toISOString(),
      day: formData.day,
      morningIncome,
      eveningIncome,
      payment,
      pendingAmount,
      advanceAmount,
      cuttingAmount,
      totalIncome,
      deduction,
      afterDeduction,
      remainingBalance,
      finalTotal,
      totalWithAdvance,
      morningO: toNum(formData.morningO),
      morningJod: toNum(formData.morningJod),
      morningKo: toNum(formData.morningKo),
      eveningO: toNum(formData.eveningO),
      eveningJod: toNum(formData.eveningJod),
      eveningKo: toNum(formData.eveningKo),
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
    setFormData({
      ...getInitialFormData(receipt.businessName),
      ...receipt,
      ...Object.fromEntries(
        Object.entries(receipt).map(([key, value]) => [
          key,
          value?.toString() || "",
        ])
      ),
      _id: receipt._id,
      serialNo: customer?.srNo || "",
      customerCompany: customer?.company || "",
      customerAddress: customer?.address || "",
      customerContactNo: customer?.contact || "",
      date: dayjs(receipt.date).format("DD-MM-YYYY"),
    });
    setGameStatus("Open");
    setGameNumbers({ num1: "", num2: "" });
    setGunOptions({ morning: "SP", evening: "SP" });
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
            <ToastContainer position="top-right" autoClose={3000} />     {" "}
      <style>{`@media print { body * { visibility: hidden; } .printable-area, .printable-area * { visibility: visible; } .printable-area { position: absolute; left: 0; top: 0; width: 100%; border: none !important; box-shadow: none !important; margin: 0; padding: 1rem !important; } .no-print { display: none !important; } .printable-area .business-name-input, .printable-area input, .printable-area select { border: none !important; background: transparent !important; padding: 0; color: black !important; -webkit-appearance: none; -moz-appearance: none; text-align: inherit; } .printable-area select { appearance: none; } .printable-area strong { font-weight: bold !important; } }`}</style>
           {" "}
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl p-4 sm:p-8">
               {" "}
        <div
          ref={printRef}
          className="printable-area p-4 border border-gray-400 rounded-lg"
        >
          {/* --- THIS IS THE FIX --- */}
          {/* This input is now inside the printable area and styled for both screen and print */}
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
          {/* ---------------------- */}         {" "}
          <div className="flex flex-col sm:flex-row justify-between items-start mb-2 text-sm">
                       {" "}
            <div className="w-full sm:w-2/5 mb-4 sm:mb-0">
                             {" "}
              <div className="flex items-center mb-2 no-print">
                                    <strong className="mr-2">Serial No:</strong>
                <select
                  name="serialNo"
                  value={formData.serialNo}
                  onChange={handleSerialNoChange}
                  className="p-1 w-28 rounded-md border bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select No.</option>
                  {customerList.map((c) => (
                    <option key={c._id} value={c.srNo}>
                      {c.srNo}
                    </option>
                  ))}
                </select>
                               {" "}
              </div>
                             {" "}
              <div className="space-y-1">
                <div>
                  <strong>Customer:</strong> {formData.customerName || "N/A"}
                </div>
                                 {" "}
                <div className="text-xs">
                  <strong>Address:</strong> {formData.customerAddress || "N/A"}
                </div>
                                 {" "}
                <div className="text-xs">
                  <strong>Contact No:</strong>{" "}
                  {formData.customerContactNo || "N/A"}
                </div>
                               {" "}
              </div>
                         {" "}
            </div>
            <div className="w-full sm:w-1/5 flex flex-col items-center mb-2">
              <div className="p-2 border border-gray-500 rounded-lg bg-white-50 w-full text-center">
                <select
                  value={gameStatus}
                  onChange={(e) => setGameStatus(e.target.value)}
                  className="font-bold text-lg bg-transparent border-none focus:outline-none mb-2"
                >
                  <option value="Open">Open</option>
                  <option value="Close">Close</option>
                </select>
                <div className="flex justify-center gap-2">
                  <input
                    type="number"
                    value={gameNumbers.num1}
                    onChange={(e) =>
                      setGameNumbers({ ...gameNumbers, num1: e.target.value })
                    }
                    className="w-12 text-center border border-gray-300 rounded"
                  />
                  <input
                    type="number"
                    value={gameNumbers.num2}
                    onChange={(e) =>
                      setGameNumbers({ ...gameNumbers, num2: e.target.value })
                    }
                    className="w-12 text-center border border-gray-300 rounded"
                  />
                </div>
              </div>
              <div className="mt-2 text-center text-sm">
                <strong>Company:</strong> {formData.customerCompany || "N/A"}
              </div>
            </div>
                       {" "}
            <div className="w-full sm:w-2/5 text-right">
                           {" "}
              <div>
                वार:- <span className="font-semibold">{formData.day}</span>
              </div>
                           {" "}
              <div>
                दि:- <span className="font-semibold">{formData.date}</span>
              </div>
                         {" "}
            </div>
                     {" "}
          </div>
                   {" "}
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
                <td className="border p-2">
                  <input
                    type="number"
                    name="morningIncome"
                    value={formData.morningIncome}
                    onChange={handleChange}
                    className="w-full text-right bg-transparent border-b focus:outline-none"
                  />
                </td>
                <td className="border p-2">
                  <div className="flex items-center justify-end">
                    <input
                      type="number"
                      name="morningO"
                      value={formData.morningO}
                      onChange={handleChange}
                      className="w-14 text-right bg-transparent border-b"
                    />
                    <span className="ml-1 text-xs">
                      *8={morningCalculations.o.toFixed(0)}
                    </span>
                  </div>
                </td>
                <td className="border p-2">
                  <div className="flex items-center justify-end">
                    <input
                      type="number"
                      name="morningJod"
                      value={formData.morningJod}
                      onChange={handleChange}
                      className="w-14 text-right bg-transparent border-b"
                    />
                    <span className="ml-1 text-xs">
                      *80={morningCalculations.jod.toFixed(0)}
                    </span>
                  </div>
                </td>
                <td className="border p-2">
                  <div className="flex items-center justify-end">
                    <input
                      type="number"
                      name="morningKo"
                      value={formData.morningKo}
                      onChange={handleChange}
                      className="w-14 text-right bg-transparent border-b"
                    />
                    <span className="ml-1 text-xs">
                      *8={morningCalculations.ko.toFixed(0)}
                    </span>
                  </div>
                </td>
                <td className="border p-2 text-center">
                  {morningCalculations.pan.toFixed(0)}
                </td>
                <td className="border p-2 text-center">
                  <select
                    value={gunOptions.morning}
                    onChange={(e) =>
                      setGunOptions({ ...gunOptions, morning: e.target.value })
                    }
                    className="bg-transparent border rounded p-1"
                  >
                    <option value="SP">SP</option>
                    <option value="DP">DP</option>
                  </select>
                </td>
              </tr>
              <tr>
                <td className="border p-2">कु.</td>
                <td className="border p-2">
                  <input
                    type="number"
                    name="eveningIncome"
                    value={formData.eveningIncome}
                    onChange={handleChange}
                    className="w-full text-right bg-transparent border-b focus:outline-none"
                  />
                </td>
                <td className="border p-2">
                  <div className="flex items-center justify-end">
                    <input
                      type="number"
                      name="eveningO"
                      value={formData.eveningO}
                      onChange={handleChange}
                      className="w-14 text-right bg-transparent border-b"
                    />
                    <span className="ml-1 text-xs">
                      *9={eveningCalculations.o.toFixed(0)}
                    </span>
                  </div>
                </td>
                <td className="border p-2">
                  <div className="flex items-center justify-end">
                    <input
                      type="number"
                      name="eveningJod"
                      value={formData.eveningJod}
                      onChange={handleChange}
                      className="w-14 text-right bg-transparent border-b"
                    />
                    <span className="ml-1 text-xs">
                      *90={eveningCalculations.jod.toFixed(0)}
                    </span>
                  </div>
                </td>
                <td className="border p-2">
                  <div className="flex items-center justify-end">
                    <input
                      type="number"
                      name="eveningKo"
                      value={formData.eveningKo}
                      onChange={handleChange}
                      className="w-14 text-right bg-transparent border-b"
                    />
                    <span className="ml-1 text-xs">
                      *9={eveningCalculations.ko.toFixed(0)}
                    </span>
                  </div>
                </td>
                <td className="border p-2 text-center">
                  {eveningCalculations.pan.toFixed(0)}
                </td>
                <td className="border p-2 text-center">
                  <select
                    value={gunOptions.evening}
                    onChange={(e) =>
                      setGunOptions({ ...gunOptions, evening: e.target.value })
                    }
                    className="bg-transparent border rounded p-1"
                  >
                    <option value="SP">SP</option>
                    <option value="DP">DP</option>
                  </select>
                </td>
              </tr>
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
                     {" "}
          </table>
                   {" "}
          <div className="flex justify-between mt-4">
                       {" "}
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
                       {" "}
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
                <span className="font-bold">{totalWithAdvance.toFixed(2)}</span>
              </div>
            </div>
                     {" "}
          </div>
                 {" "}
        </div>
               {" "}
        <div className="no-print flex justify-center mt-6 space-x-4">
                   {" "}
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-green-500 text-white rounded-full shadow-lg hover:bg-green-600"
          >
            Save
          </button>
                   {" "}
          <button
            onClick={handlePrint}
            className="px-6 py-2 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 flex items-center"
          >
            <FaPrint className="mr-2" />
            Print
          </button>
                   {" "}
          <button
            onClick={clearForm}
            className="px-6 py-2 bg-gray-500 text-white rounded-full shadow-lg hover:bg-gray-600"
          >
            Clear
          </button>
                 {" "}
        </div>
             {" "}
      </div>
           {" "}
      <div className="no-print mt-8 max-w-4xl mx-auto bg-white rounded-lg shadow-xl p-8">
                <h2 className="text-2xl font-bold mb-4">Saved Receipts</h2>
               {" "}
        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 mb-4 rounded-md border"
        />
               {" "}
        <div className="overflow-x-auto">
                   {" "}
          <table className="min-w-full divide-y">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs uppercase">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs uppercase">Total</th>
                <th className="px-6 py-3 text-center text-xs uppercase">
                  Actions
                </th>
              </tr>
            </thead>
                       {" "}
            <tbody className="bg-white divide-y">
                           {" "}
              {filteredReceipts.length > 0 ? (
                filteredReceipts.map((r) => (
                  <tr key={r._id}>
                    <td className="px-6 py-4">{r.customerName}</td>
                    <td className="px-6 py-4">
                      {dayjs(r.date).format("DD-MM-YYYY")}
                    </td>
                    <td className="px-6 py-4">{r.finalTotal.toFixed(2)}</td>
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
                  <td colSpan="4" className="text-center py-4 text-gray-500">
                    No receipts found.
                  </td>
                </tr>
              )}
                         {" "}
            </tbody>
                     {" "}
          </table>
                 {" "}
        </div>
             {" "}
      </div>
         {" "}
    </div>
  );
};

export default ReceiptForm;
