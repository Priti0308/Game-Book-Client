import React, { useState, useEffect, useRef } from "react";
import dayjs from "dayjs";

const ReceiptForm = ({ businessName }) => {
  const [formData, setFormData] = useState({
    id: null,
    businessName: businessName || "आपले दुकान",
    customerId: "",
    customerName: "",
    day: dayjs().format("dddd"),
    date: dayjs().format("DD-MM-YYYY"),
    morningIncome: "",
    eveningIncome: "",
    totalIncome: "",
    deduction: "",
    afterDeduction: "",
    payment: "",
    remainingBalance: "",
    pendingAmount: "",
    finalTotal: "",
    totalReceived: "",
    advanceAmount: "",
    totalWithAdvance: "",
  });
  
  const [customerList, setCustomerList] = useState([]);
  
  const [receipts, setReceipts] = useState(() => {
    const savedReceipts = localStorage.getItem("receipts");
    return savedReceipts ? JSON.parse(savedReceipts) : [];
  });
  
  const [toastMessage, setToastMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const printRef = useRef();
  const token = localStorage.getItem("token");

  // Fetch customer data from a mock API endpoint
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        // Simulating an API call with mock data
        const response = await fetch('http://localhost:5000/api/customers', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        setCustomerList(data.customers || []);
      } catch (error) {
        showToast("Failed to fetch customer data. Using dummy data.");
        console.error("Failed to fetch customers:", error);
        setCustomerList([
          { _id: '1', name: 'सुरेश' },
          { _id: '2', name: 'जयराम' },
          { _id: '3', name: 'अजित' }
        ]);
      }
    };
    fetchCustomers();
  }, [token]);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };
  
  // Recalculate derived values whenever relevant inputs change
  useEffect(() => {
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
    const totalReceived = deduction + payment;
    const totalWithAdvance = totalReceived + advanceAmount;

    setFormData((prev) => ({
      ...prev,
      totalIncome: totalIncome.toFixed(2),
      deduction: deduction.toFixed(2),
      afterDeduction: afterDeduction.toFixed(2),
      remainingBalance: remainingBalance.toFixed(2),
      finalTotal: finalTotal.toFixed(2),
      totalReceived: totalReceived.toFixed(2),
      totalWithAdvance: totalWithAdvance.toFixed(2),
    }));
  }, [
    formData.morningIncome,
    formData.eveningIncome,
    formData.payment,
    formData.pendingAmount,
    formData.advanceAmount,
  ]);
  
  // Sync receipts to localStorage whenever the receipts state changes
  useEffect(() => {
    localStorage.setItem("receipts", JSON.stringify(receipts));
  }, [receipts]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
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
  
  const handleSave = () => {
    const now = dayjs().format("DD-MM-YYYY");
    const newReceipt = { ...formData, date: now, id: formData.id || Date.now() };

    if (formData.id) {
      // Update existing receipt
      setReceipts(receipts.map(r => r.id === formData.id ? newReceipt : r));
      showToast("Receipt updated successfully!");
    } else {
      // Add new receipt
      setReceipts([...receipts, newReceipt]);
      showToast("Receipt saved successfully!");
    }
    
    // Clear the form
    setFormData({
      id: null,
      businessName: "आपले दुकान",
      customerId: "",
      customerName: "",
      day: dayjs().format("dddd"),
      date: dayjs().format("DD-MM-YYYY"),
      morningIncome: "",
      eveningIncome: "",
      totalIncome: "",
      deduction: "",
      afterDeduction: "",
      payment: "",
      remainingBalance: "",
      pendingAmount: "",
      finalTotal: "",
      totalReceived: "",
      advanceAmount: "",
      totalWithAdvance: "",
    });
  };

  const handleDelete = (id) => {
    const isConfirmed = window.confirm("Are you sure you want to delete this receipt?");
    if (isConfirmed) {
      setReceipts(receipts.filter(r => r.id !== id));
      showToast("Receipt deleted successfully!");
    }
  };

  const handleEdit = (id) => {
    const receiptToEdit = receipts.find(r => r.id === id);
    setFormData(receiptToEdit);
  };
  
  const handlePrint = () => {
    const content = printRef.current;
    if (content) {
      const originalContents = document.body.innerHTML;
      const printContents = content.innerHTML;
      document.body.innerHTML = printContents;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload();
    }
  };
  
  const handleTablePrint = (id) => {
    const receiptToPrint = receipts.find(r => r.id === id);
    if (receiptToPrint) {
        setFormData(receiptToPrint);
        setTimeout(() => handlePrint(), 100);
    }
  };

  const filteredReceipts = receipts.filter(r =>
    r.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.date.includes(searchTerm) ||
    r.finalTotal.toString().includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans text-gray-800">
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 p-4 bg-green-500 text-white rounded-lg shadow-xl animate-fade-in-out">
          {toastMessage}
        </div>
      )}
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl p-8">
        {/* <h1 className="text-3xl font-bold text-center mb-6">दैनिक पावती</h1> */}
        <div className="text-center mb-4">
            <h3 className="text-xl font-bold text-gray-800">
              <input
                type="text"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                className="text-center font-bold text-xl rounded-md p-1 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </h3>
          </div>
        <div ref={printRef} className="p-4 border border-gray-400 rounded-lg">
          
          
          <div className="flex justify-between items-center mb-4 text-sm">
            <div className="flex items-center">
              <span className="mr-2">नांव:–</span>
              <select
                name="customerId"
                value={formData.customerId}
                onChange={handleCustomerSelect}
                className="p-1 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">निवडा</option>
                {customerList.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
              <span className="ml-2 font-semibold">{formData.customerName}</span>
            </div>
            <div className="text-right">
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
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border p-2">आ.</td>
                <td className="border p-2 text-right">
                  <input type="text" name="morningIncome" value={formData.morningIncome} onChange={handleChange} className="w-full text-right bg-transparent border-b border-gray-300 focus:outline-none" />
                </td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
              </tr>
              <tr>
                <td className="border p-2">कु.</td>
                <td className="border p-2 text-right">
                  <input type="text" name="eveningIncome" value={formData.eveningIncome} onChange={handleChange} className="w-full text-right bg-transparent border-b border-gray-300 focus:outline-none" />
                </td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
              </tr>
              <tr>
                <td className="border p-2">टो.</td>
                <td className="border p-2 text-right">{formData.totalIncome}</td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
              </tr>
              <tr>
                <td className="border p-2">क.</td>
                <td className="border p-2 text-right">{formData.deduction}</td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
              </tr>
              <tr>
                <td className="border p-2">टो.</td>
                <td className="border p-2 text-right">{formData.afterDeduction}</td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
              </tr>
              <tr>
                <td className="border p-2">पें.</td>
                <td className="border p-2 text-right">
                  <input type="text" name="payment" value={formData.payment} onChange={handleChange} className="w-full text-right bg-transparent border-b border-gray-300 focus:outline-none" />
                </td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
              </tr>
              <tr>
                <td className="border p-2">टो.</td>
                <td className="border p-2 text-right">{formData.remainingBalance}</td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
              </tr>
              <tr>
                <td className="border p-2">मा.</td>
                <td className="border p-2 text-right">
                  <input type="text" name="pendingAmount" value={formData.pendingAmount} onChange={handleChange} className="w-full text-right bg-transparent border-b border-gray-300 focus:outline-none" />
                </td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
              </tr>
              <tr>
                <td className="border p-2">टो.</td>
                <td className="border p-2 text-right">{formData.finalTotal}</td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
                <td className="border p-2"></td>
              </tr>
            </tbody>
          </table>
          <div className="flex justify-between items-end mt-4">
            <div className="w-1/2 p-2 border border-gray-400 rounded-md h-20"></div>
            <div className="w-1/2 ml-4 p-2 border border-gray-400 rounded-md">
              <div className="flex items-center justify-between">
                <span className="mr-2">आड:-</span>
                <input type="text" name="advanceAmount" value={formData.advanceAmount} onChange={handleChange} className="text-right bg-transparent border-b border-gray-300 focus:outline-none" />
              </div>
              <div className="flex items-center justify-between mt-2">
                <span>टो:-</span>
                <span className="font-bold">{formData.totalWithAdvance}</span>
            </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-center mt-6 space-x-4">
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-green-500 text-white rounded-full shadow-lg hover:bg-green-600 transition-colors"
          >
            {formData.id ? "Update" : "Save"} Receipt
          </button>
          <button
            onClick={() => setFormData({ id: null, businessName: "आपले दुकान", customerId: "", customerName: "", day: dayjs().format("dddd"), date: dayjs().format("DD-MM-YYYY"), morningIncome: "", eveningIncome: "", totalIncome: "", deduction: "", afterDeduction: "", payment: "", remainingBalance: "", pendingAmount: "", finalTotal: "", totalReceived: "", advanceAmount: "", totalWithAdvance: "", })}
            className="px-6 py-2 bg-gray-500 text-white rounded-full shadow-lg hover:bg-gray-600 transition-colors"
          >
            Clear Form
          </button>
        </div>
      </div>
      
      <div className="mt-8 max-w-4xl mx-auto bg-white rounded-lg shadow-xl p-8">
        <h2 className="text-2xl font-bold mb-4">Saved Receipts</h2>
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search receipts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
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
              {filteredReceipts.map(receipt => (
                <tr key={receipt.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{receipt.customerName}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{receipt.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{receipt.finalTotal}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center space-x-2">
                    <button onClick={() => handleEdit(receipt.id)} className="text-blue-600 hover:text-blue-900">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5 inline-block"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0l.965.965M12 14l-4.243 4.243m4.243-4.243l-4.243 4.243"></path></svg>
                    </button>
                    <button onClick={() => handleTablePrint(receipt.id)} className="text-green-600 hover:text-green-900">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5 inline-block"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                    <button onClick={() => handleDelete(receipt.id)} className="text-red-600 hover:text-red-900">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5 inline-block"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </td>
                </tr>
              ))}
              {filteredReceipts.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center py-4 text-gray-500">No receipts saved.</td>
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
