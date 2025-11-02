import React, { useState, useEffect } from 'react';
import axios from 'axios';
import dayjs from 'dayjs'; // Import dayjs to check dates
import { toast, ToastContainer } from 'react-toastify';
import { FaSpinner, FaExclamationCircle, FaSave } from 'react-icons/fa';
import 'react-toastify/dist/ReactToastify.css';

const API_BASE_URI = "https://game-book.onrender.com"; // Your backend URL

const Shortcut = () => {
    const [customerIncomes, setCustomerIncomes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const token = localStorage.getItem("token");

    useEffect(() => {
        const fetchData = async () => {
            if (!token) {
                setError("Authentication token not found. Please log in.");
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                const config = { headers: { Authorization: `Bearer ${token}` } };
                
                // 1. Fetch both customers and all receipts in parallel
                const [customerResponse, receiptResponse] = await Promise.all([
                    axios.get(`${API_BASE_URI}/api/customers`, config),
                    axios.get(`${API_BASE_URI}/api/receipts`, config)
                ]);

                const customerData = customerResponse.data.customers || customerResponse.data;
                const allReceipts = receiptResponse.data.receipts || receiptResponse.data;

                // 2. Filter receipts to find only today's receipts
                const todayStr = dayjs().format("YYYY-MM-DD");
                const todaysReceipts = allReceipts.filter(r => dayjs(r.date).format("YYYY-MM-DD") === todayStr);

                // 3. Map over customers and merge data from today's receipts
                const initialData = customerData
                    .sort((a, b) => Number(a.srNo) - Number(b.srNo))
                    .map(customer => {
                        // Find this customer's receipt for today, if one exists
                        const receipt = todaysReceipts.find(r => r.customerId === customer._id);
                        
                        // Find the 'aamdan' (आ.) row from that receipt
                        const aamdanRow = receipt?.gameRows?.find(row => row.type === "आ.");
                        // Find the 'kulan' (कु.) row from that receipt
                        const kulanRow = receipt?.gameRows?.find(row => row.type === "कु.");

                        // Set the incomes, or '' if not found
                        return {
                            ...customer,
                            aamdanIncome: aamdanRow?.income?.toString() || '',
                            kulanIncome: kulanRow?.income?.toString() || ''
                        };
                    });
                    
                setCustomerIncomes(initialData);

            } catch (err) {
                setError(err.response?.data?.message || "Failed to load data.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [token]); // This effect runs once on load

    const handleInputChange = (customerId, field, value) => {
        // Allow only numbers (or empty string for clearing)
        if (/^[0-9]*$/.test(value)) {
            setCustomerIncomes(prevIncomes =>
                prevIncomes.map(customer =>
                    customer._id === customerId
                        ? { ...customer, [field]: value }
                        : customer
                )
            );
        }
    };

    const handleSave = async () => {
        const dataToSave = customerIncomes
            .filter(c => c.aamdanIncome || c.kulanIncome) // Only include customers with entered income
            .map(c => ({
                customerId: c._id,
                aamdanIncome: Number(c.aamdanIncome) || 0,
                kulanIncome: Number(c.kulanIncome) || 0,
            }));

        if (dataToSave.length === 0) {
            toast.warn("Please enter an income for at least one customer.");
            return;
        }

        setSaving(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            // This endpoint is correct. Your backend will handle creating/updating the receipt.
            await axios.post(`${API_BASE_URI}/api/shortcuts/income`, dataToSave, config);
            toast.success("Incomes saved successfully!");

            // We do NOT clear the fields, so the saved values remain visible
            // as you requested.

        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to save incomes.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center"><FaSpinner className="animate-spin text-purple-600 text-4xl mx-auto" /></div>;
    if (error) return <div className="p-8 text-center text-red-600"><FaExclamationCircle className="mx-auto text-4xl mb-2" />{error}</div>;

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-full">
            <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
            <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-6">
                <h1 className="text-3xl font-bold text-gray-800 mb-6">Manual Income Entry</h1>
                <div className="overflow-x-auto border rounded-lg shadow">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-3 text-left text-sm font-semibold text-gray-600 w-16">Sr.No.</th>
                                <th className="p-3 text-left text-sm font-semibold text-gray-600">Name</th>
                                <th className="p-3 text-left text-sm font-semibold text-gray-600">आ. (Morning)</th>
                                <th className="p-3 text-left text-sm font-semibold text-gray-600">कु. (Evening)</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {customerIncomes.map((customer) => (
                                <tr key={customer._id}>
                                    <td className="p-2 text-sm text-gray-700 text-center">{customer.srNo}</td>
                                    <td className="p-2 text-sm font-medium text-gray-900">{customer.name}</td>
                                    <td className="p-2">
                                        <input
                                            type="text" 
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            value={customer.aamdanIncome}
                                            onChange={(e) => handleInputChange(customer._id, 'aamdanIncome', e.target.value)}
                                            className="w-full p-2 border rounded-md focus:ring-purple-500 focus:border-purple-500 text-right"
                                            placeholder="₹"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            value={customer.kulanIncome}
                                            onChange={(e) => handleInputChange(customer._id, 'kulanIncome', e.target.value)}
                                            className="w-full p-2 border rounded-md focus:ring-purple-500 focus:border-purple-500 text-right"
                                            placeholder="₹"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="mt-6 flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 disabled:opacity-50 transition-colors"
                    >
                        {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
                        {saving ? 'Saving...' : 'Save Incomes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Shortcut;