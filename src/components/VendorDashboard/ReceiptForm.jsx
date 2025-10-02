import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
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

// Helper function to safely evaluate arithmetic expressions
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

const getInitialFormData = (businessName) => ({
  _id: null,
  businessName: businessName || "Bappa Gaming",
  customerId: "",
  customerName: "",
  customerCompany: "",
  day: dayjs().format("dddd"),
  date: dayjs().format("DD-MM-YYYY"),
  payment: "",
  pendingAmount: "",
  advanceAmount: "",
  cuttingAmount: "",
  jama: "",
});

const initialGameRows = [
  { id: 1, type: "आ.", income: "", o: "", jod: "", ko: "", pan: "100", gun: "SP", multiplier: 8 },
  { id: 2, type: "कु.", income: "", o: "", jod: "", ko: "", pan: "120", gun: "SP", multiplier: 9 },
];

const ReceiptForm = ({ businessName }) => {
  const [formData, setFormData] = useState(() => getInitialFormData(businessName));
  const [gameRows, setGameRows] = useState(initialGameRows);
  const [openCloseValues, setOpenCloseValues] = useState({ open: "", close: "", jod: "" });
  const [customerList, setCustomerList] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const printRef = useRef();
  const token = localStorage.getItem("token");
  const formRef = useRef(null);

  const clearForm = useCallback(() => {
    setFormData(getInitialFormData(formData.businessName));
    setGameRows(initialGameRows);
    setOpenCloseValues({ open: "", close: "", jod: "" });
  }, [formData.businessName]);

  const fetchCustomers = useCallback(async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API_BASE_URI}/api/customers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const customers = (response.data.customers || []).sort((a, b) => a.name.localeCompare(b.name));
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
    const selectedCustomer = customerList.find((c) => c._id === selectedCustomerId);

    let lastPendingAmount = "";
    if (selectedCustomerId) {
      const customerReceipts = receipts.filter((r) => r.customerId === selectedCustomerId);
      if (customerReceipts.length > 0) {
        customerReceipts.sort((a, b) => new Date(b.date) - new Date(a.date));
        if (customerReceipts[0].finalTotal) {
          lastPendingAmount = customerReceipts[0].finalTotal.toString();
        }
      }
    }

    setFormData((prev) => ({
      ...prev,
      customerId: selectedCustomer?._id || "",
      customerName: selectedCustomer?.name || "",
      pendingAmount: lastPendingAmount,
    }));
  };

  const handleOpenCloseChange = (e) => {
    const { name, value } = e.target;
    setOpenCloseValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleRowChange = (index, e) => {
    const { name, value } = e.target;
    const updatedRows = [...gameRows];
    updatedRows[index][name] = value;
    setGameRows(updatedRows);
  };
  
  const handleMultiplierChange = (index, value) => {
    const updatedRows = [...gameRows];
    updatedRows[index].multiplier = Number(value) || 0;
    setGameRows(updatedRows);
  };

  const addRow = () => {
    if (gameRows.length < 10) {
      const newRow = { id: Date.now(), type: "", income: "", o: "", jod: "", ko: "", pan: "", gun: "SP", multiplier: 8 };
      setGameRows([...gameRows, newRow]);
    } else {
      toast.warn("You can add a maximum of 10 rows.");
    }
  };

  const removeRow = (index) => {
    if (index > 1) {
      const updatedRows = gameRows.filter((_, i) => i !== index);
      setGameRows(updatedRows);
    } else {
      toast.warn("Cannot remove the initial rows.");
    }
  };

  const calculationResults = useMemo(() => {
    let oFinalTotal = 0, jodFinalTotal = 0, koFinalTotal = 0;

    gameRows.forEach((row) => {
      const oVal = evaluateExpression(row.o);
      const jodVal = evaluateExpression(row.jod);
      const koVal = evaluateExpression(row.ko);
      const multiplier = row.multiplier;

      if (multiplier !== undefined) {
        oFinalTotal += oVal * Number(multiplier);
        jodFinalTotal += jodVal * Number(multiplier);
        koFinalTotal += koVal * Number(multiplier);
      } else {
        oFinalTotal += oVal;
        jodFinalTotal += jodVal;
        koFinalTotal += koVal;
      }
    });

    const totalIncome = gameRows.reduce((sum, row) => sum + Number(row.income || 0), 0);
    const payment = oFinalTotal + jodFinalTotal + koFinalTotal;
    const deduction = totalIncome * 0.1;
    const afterDeduction = totalIncome - deduction;
    const pendingAmount = Number(formData.pendingAmount) || 0;
    const advanceAmount = Number(formData.advanceAmount) || 0;
    const cuttingAmount = Number(formData.cuttingAmount) || 0;
    const remainingBalance = afterDeduction - payment;
    const finalTotal = remainingBalance + pendingAmount;
    const totalWithAdvance = deduction + payment + cuttingAmount + advanceAmount;
    const jamaTotal = afterDeduction;

    return { totalIncome, payment, deduction, afterDeduction, remainingBalance, finalTotal, totalWithAdvance, jamaTotal, oFinalTotal, jodFinalTotal, koFinalTotal };
  }, [gameRows, formData.pendingAmount, formData.advanceAmount, formData.cuttingAmount]);

  useEffect(() => {
    setFormData((prev) => ({ ...prev, payment: calculationResults.payment.toFixed(2) }));
  }, [calculationResults.payment]);

  const handleSave = async () => {
    if (!formData.customerId) {
      toast.error("Please select a customer.");
      return;
    }

    const receiptToSend = {
      ...formData,
      ...calculationResults,
      openCloseValues,
      gameRows,
      date: dayjs(formData.date, "DD-MM-YYYY").toISOString(),
    };

    try {
      if (formData._id) {
        await axios.put(
          `${API_BASE_URI}/api/receipts/${formData._id}`,
          receiptToSend,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success("Receipt updated successfully!");
      } else {
        await axios.post(
          `${API_BASE_URI}/api/receipts`,
          receiptToSend,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success("Receipt saved successfully!");
      }
      clearForm();
      fetchReceipts();
    } catch (error) {
      toast.error(error.response?.data?.message || "Error saving receipt");
      console.error("Save error:", error);
    }
  };
  
  const handleEdit = (id) => {
    const receipt = receipts.find((r) => r._id === id);
    if (!receipt) {
        toast.error("Could not find receipt to edit.");
        return;
    }
    const customer = customerList.find((c) => c._id === receipt.customerId);

    setFormData({
        ...getInitialFormData(receipt.businessName),
        ...receipt,
        _id: receipt._id,
        customerName: customer?.name || receipt.customerName,
        date: dayjs(receipt.date).format("DD-MM-YYYY"),
    });

    setGameRows(receipt.gameRows || initialGameRows);
    setOpenCloseValues(receipt.openCloseValues || { open: "", close: "", jod: "" });
    
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this receipt?")) {
        try {
            await axios.delete(`${API_BASE_URI}/api/receipts/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            toast.success("Receipt deleted successfully.");
            fetchReceipts();
        } catch (error) {
            toast.error("Failed to delete receipt.");
            console.error("Delete error:", error);
        }
    }
  };

  const handlePrint = () => window.print();

  const handleTablePrint = (id) => {
    handleEdit(id);
    setTimeout(() => handlePrint(), 200);
  };

  const filteredReceipts = receipts.filter((r) =>
    (r.customerName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8 font-sans">
      <ToastContainer position="top-right" autoClose={3000} />
      <style>{`
        @media print { 
          body * { visibility: hidden; } 
          .printable-area, .printable-area * { visibility: visible; } 
          .printable-area { position: absolute; left: 0; top: 0; width: 100%; height: auto; border: none !important; box-shadow: none !important; margin: 0; padding: 1rem !important; } 
          .print-hidden { display: none !important; } 
          .printable-area input, .printable-area select { border: none !important; background: transparent !important; padding: 0; color: black !important; -webkit-appearance: none; -moz-appearance: none; appearance: none; text-align: inherit; font-size: inherit; font-family: inherit; font-weight: inherit; }
          .printable-area input[type=number]::-webkit-inner-spin-button, .printable-area input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        }`}</style>

      <div ref={formRef} className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl p-4 sm:p-8">
        <div ref={printRef} className="printable-area p-4 border border-gray-400 rounded-lg">
          <div className="text-center mb-4"><h2 className="text-center font-bold text-2xl">{formData.businessName}</h2></div>
          <div className="flex flex-col sm:flex-row justify-between items-start mb-2 text-sm">
            <div className="w-full sm:w-1/3 mb-4 sm:mb-0">
              <div className="flex items-center mb-2">
                <strong className="mr-2">Customer:</strong>
                <select name="customerId" value={formData.customerId} onChange={handleCustomerChange} className="p-1 w-48 rounded-md border bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select Customer</option>
                  {customerList.map((c) => (<option key={c._id} value={c._id}>{c.name}</option>))}
                </select>
              </div>
              <div className="space-y-1 mt-2"><div><strong>Name:</strong> {formData.customerName || "N/A"}</div></div>
            </div>
            <div className="w-full sm:w-1/3 flex flex-col items-center mb-2">
              <div className="p-2 border border-gray-500 rounded-lg w-full max-w-[220px] space-y-2 text-sm">
                <div className="flex items-center justify-between"><span className="font-bold">Open:</span><input type="text" name="open" value={openCloseValues.open} onChange={handleOpenCloseChange} className="w-28 text-center border border-gray-300 rounded"/></div>
                <div className="flex items-center justify-between"><span className="font-bold">Close:</span><input type="text" name="close" value={openCloseValues.close} onChange={handleOpenCloseChange} className="w-28 text-center border border-gray-300 rounded"/></div>
                <div className="flex items-center justify-between"><span className="font-bold">Jod:</span><input type="text" name="jod" value={openCloseValues.jod} onChange={handleOpenCloseChange} className="w-28 text-center border border-gray-300 rounded"/></div>
              </div>
              <div className="mt-2 text-center text-sm flex items-center justify-center">
                 <strong>Company:</strong>
                 <select name="customerCompany" value={formData.customerCompany} onChange={handleChange} className="ml-2 bg-transparent border rounded p-1 text-xs print-hidden">
                   <option value="">Choose...</option>
                   {COMPANY_NAMES.map((company, index) => (<option key={index} value={company}>{company}</option>))}
                 </select>
                 <span className="hidden print:inline ml-2">{formData.customerCompany || "N/A"}</span>
              </div>
            </div>
            <div className="w-full sm:w-1/3 text-right">
              <div>वार:- <span className="font-semibold">{formData.day}</span></div>
              <div>दि:- <span className="font-semibold">{formData.date}</span></div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed border-collapse">
                <colgroup>
                    <col style={{ width: '8%' }} /><col style={{ width: '15%' }} /><col style={{ width: '19%' }} /><col style={{ width: '19%' }} /><col style={{ width: '19%' }} /><col style={{ width: '10%' }} /><col style={{ width: '10%' }} />
                </colgroup>
                <thead>
                <tr className="bg-gray-100">
                    <th className="border p-2 text-center">ओ.</th><th className="border p-2 text-center">रक्कम</th><th className="border p-2 text-center">ओ.</th><th className="border p-2 text-center">जोड</th><th className="border p-2 text-center">को.</th><th className="border p-2 text-center">पान</th><th className="border p-2 text-center">गुण</th>
                </tr>
                </thead>
                <tbody>
                {gameRows.map((row, index) => {
                    const multiplier = row.multiplier;
                    const hasMultiplier = multiplier !== undefined;
                    
                    const renderCellWithCalculation = (colName) => (
                        <div className="flex items-center justify-end">
                            <input type="text" name={colName} value={row[colName]} onChange={(e) => handleRowChange(index, e)} className="w-full text-right bg-transparent border-b"/>
                            {hasMultiplier && (
                                <span className="text-gray-500 text-xs ml-1 whitespace-nowrap flex items-center">
                                    {row[colName] && `= ${evaluateExpression(row[colName])}`}{" "}
                                    * <input type="number" value={multiplier} onChange={(e) => handleMultiplierChange(index, e.target.value)} className="w-8 text-center bg-transparent font-bold focus:outline-none"/>
                                </span>
                            )}
                        </div>
                    );

                    if (row.type === "") {
                    return (
                        <tr key={row.id}>
                        <td className="border p-2"></td><td className="border p-2"></td>
                        <td className="border p-2">{renderCellWithCalculation('o')}</td>
                        <td className="border p-2">{renderCellWithCalculation('jod')}</td>
                        <td className="border p-2">{renderCellWithCalculation('ko')}</td>
                        <td className="border p-2"><input type="text" name="pan" value={row.pan} onChange={(e) => handleRowChange(index, e)} className="w-full text-center bg-transparent border-b" /></td>
                        <td className="border p-2 text-center">
                            <div className="flex items-center justify-center space-x-1">
                            <select name="gun" value={row.gun} onChange={(e) => handleRowChange(index, e)} className="bg-transparent border rounded p-1"><option value="SP">SP</option><option value="DP">DP</option></select>
                            <button onClick={() => removeRow(index)} className="print-hidden text-red-500 hover:text-red-700"><FaMinus size={12} /></button>
                            </div>
                        </td>
                        </tr>
                    );
                    } else {
                    return (
                        <tr key={row.id}>
                        <td className="border p-2">{row.type}</td>
                        <td className="border p-2"><input type="text" name="income" value={row.income} onChange={(e) => handleRowChange(index, e)} className="w-full text-right bg-transparent border-b focus:outline-none" /></td>
                        <td className="border p-2">{renderCellWithCalculation('o')}</td>
                        <td className="border p-2">{renderCellWithCalculation('jod')}</td>
                        <td className="border p-2">{renderCellWithCalculation('ko')}</td>
                        <td className="border p-2"><input type="text" name="pan" value={row.pan} onChange={(e) => handleRowChange(index, e)} className="w-full text-center bg-transparent border-b" /></td>
                        <td className="border p-2 text-center"><select name="gun" value={row.gun} onChange={(e) => handleRowChange(index, e)} className="bg-transparent border rounded p-1"><option value="SP">SP</option><option value="DP">DP</option></select></td>
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
                    <tr><td className="border p-2">टो.</td><td className="border p-2 text-right font-bold">{calculationResults.totalIncome.toFixed(2)}</td><td colSpan="5" className="border p-2"></td></tr>
                    <tr><td className="border p-2">क.</td><td className="border p-2 text-right">{calculationResults.deduction.toFixed(2)}</td><td colSpan="5" className="border p-2"></td></tr>
                    <tr><td className="border p-2">टो.</td><td className="border p-2 text-right font-bold">{calculationResults.afterDeduction.toFixed(2)}</td><td colSpan="5" className="border p-2"></td></tr>
                    <tr><td className="border p-2">पें.</td><td className="border p-2 text-right font-bold">{calculationResults.payment.toFixed(2)}</td><td colSpan="5" className="border p-2"></td></tr>
                    <tr><td className="border p-2">टो.</td><td className="border p-2 text-right font-bold">{calculationResults.remainingBalance.toFixed(2)}</td><td colSpan="5" className="border p-2"></td></tr>
                    <tr><td className="border p-2">मा.</td><td className="border p-2"><input type="number" name="pendingAmount" value={formData.pendingAmount} readOnly className="w-full text-right bg-gray-100 border-b"/></td><td colSpan="5" className="border p-2"></td></tr>
                    <tr><td className="border p-2">टो.</td><td className="border p-2 text-right font-bold">{calculationResults.finalTotal.toFixed(2)}</td><td colSpan="5" className="border p-2"></td></tr>
                    <tr className="bg-gray-50">
                        <td colSpan="2" className="border p-2 font-bold text-right align-middle">Total *</td>
                        <td className="border p-2 font-medium text-right">{calculationResults.oFinalTotal.toFixed(2)}</td>
                        <td className="border p-2 font-medium text-right">{calculationResults.jodFinalTotal.toFixed(2)}</td>
                        <td className="border p-2 font-medium text-right">{calculationResults.koFinalTotal.toFixed(2)}</td>
                        <td colSpan="2" className="border p-1"></td>
                    </tr>
                </tbody>
            </table>
          </div>

          <div className="print-hidden mt-2 flex justify-end">
            <button onClick={addRow} className="flex items-center px-3 py-1 bg-blue-500 text-white rounded-md shadow-sm hover:bg-blue-600 text-sm"><FaPlus size={12} className="mr-1" /> Add Row</button>
          </div>

          <div className="flex justify-between mt-4">
            <div className="w-1/2 mr-2 p-2 border rounded-md space-y-2 text-sm">
                <div className="flex justify-between items-center"><span>जमा:-</span><input type="number" name="jama" value={formData.jama} onChange={handleChange} className="w-2/3 text-right bg-transparent border-b"/></div>
                <div className="flex justify-between"><span>टो:-</span><span className="font-bold">{calculationResults.jamaTotal.toFixed(2)}</span></div>
            </div>
            <div className="w-1/2 ml-2 p-2 border rounded-md space-y-2 text-sm">
                <div className="flex justify-between items-center"><span>आड:-</span><input type="number" name="advanceAmount" value={formData.advanceAmount} onChange={handleChange} className="w-2/3 text-right bg-transparent border-b"/></div>
                <div className="flex justify-between items-center"><span>कटिंग:-</span><input type="number" name="cuttingAmount" value={formData.cuttingAmount} onChange={handleChange} className="w-2/3 text-right bg-transparent border-b"/></div>
                <div className="flex justify-between"><span>टो:-</span><span className="font-bold">{calculationResults.totalWithAdvance.toFixed(2)}</span></div>
            </div>
          </div>
        </div>
        
        <div className="print-hidden flex justify-center mt-6 space-x-4">
            <button onClick={handleSave} className="px-6 py-2 bg-green-500 text-white rounded-full shadow-lg hover:bg-green-600">Save</button>
            <button onClick={handlePrint} className="px-6 py-2 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 flex items-center"><FaPrint className="mr-2" />Print</button>
            <button onClick={clearForm} className="px-6 py-2 bg-gray-500 text-white rounded-full shadow-lg hover:bg-gray-600">Clear</button>
        </div>
      </div>
      
      <div className="print-hidden mt-8 max-w-4xl mx-auto bg-white rounded-lg shadow-xl p-8">
        <h2 className="text-2xl font-bold mb-4">Saved Receipts</h2>
        <input
          type="text"
          placeholder="Search Receipts by Customer Name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 mb-4 border border-gray-300 rounded-md"
        />
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReceipts.length > 0 ? (
                filteredReceipts.map((r) => (
                  <tr key={r._id}>
                    <td className="px-6 py-4 whitespace-nowrap">{r.customerName}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{dayjs(r.date).format("DD-MM-YYYY")}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{r.finalTotal && Number(r.finalTotal).toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center space-x-3">
                      <button onClick={() => handleEdit(r._id)} className="text-blue-600 hover:text-blue-800"><FaEdit size={18} /></button>
                      <button onClick={() => handleTablePrint(r._id)} className="text-green-600 hover:text-green-800"><FaPrint size={18} /></button>
                      <button onClick={() => handleDelete(r._id)} className="text-red-600 hover:text-red-800"><FaTrashAlt size={18} /></button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="text-center py-4 text-gray-500">No receipts found.</td>
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

