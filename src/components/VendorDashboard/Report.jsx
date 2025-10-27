import React, { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import {
    FaSearch,
    FaArrowLeft,
    FaSpinner,
    FaExclamationCircle,
    // FaFilePdf, // Removed PDF icon
    FaFileCsv,
    FaPrint
} from "react-icons/fa"; // react-icons might still cause issues if not installed/configured in the environment
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
// Removed PDF library imports
// import jsPDF from "jspdf";
// import "jspdf-autotable";

// --- Constants ---
const API_BASE_URI = "https://game-book.onrender.com"; // Make sure this is your correct backend URL
const ITEMS_PER_PAGE = 10;
const SEARCH_DEBOUNCE_DELAY = 300; // milliseconds

// --- Custom Hook for Debouncing ---
const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
};

// --- Helper to format currency ---
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount || 0);
};

// --- UI Sub-components ---

const SkeletonRow = () => (
    <tr className="animate-pulse">
        <td className="p-3"><div className="h-4 bg-gray-200 rounded"></div></td>
        <td className="p-3"><div className="h-4 bg-gray-200 rounded"></div></td>
        <td className="p-3"><div className="h-4 bg-gray-200 rounded"></div></td>
        <td className="p-3"><div className="h-4 bg-gray-200 rounded"></div></td>
    </tr>
);

const EmptyState = ({ icon, title, message, onRetry }) => (
    <div className="text-center py-10 px-4">
        <div className="flex justify-center items-center mx-auto w-16 h-16 bg-gray-100 rounded-full">
            {icon}
        </div>
        <h3 className="mt-4 text-lg font-semibold text-gray-700">{title}</h3>
        <p className="mt-2 text-sm text-gray-500">{message}</p>
        {onRetry && (
            <button
                onClick={onRetry}
                className="mt-6 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
                Retry
            </button>
        )}
    </div>
);

const CustomerTable = ({ customers, onSelectCustomer, loading, pageStartIndex }) => {
    if (loading) {
        return (
            <div className="overflow-x-auto border rounded-lg shadow">
                <table className="min-w-full">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-3 text-left text-sm font-semibold text-gray-600 tracking-wider">Sr.No.</th>
                            <th className="p-3 text-left text-sm font-semibold text-gray-600 tracking-wider">Name</th>
                            <th className="p-3 text-right text-sm font-semibold text-gray-600 tracking-wider">येणे</th>
                            <th className="p-3 text-right text-sm font-semibold text-gray-600 tracking-wider">देणे</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => <SkeletonRow key={i} />)}
                    </tbody>
                </table>
            </div>
        );
    }

    if (customers.length === 0) {
        return <EmptyState icon={<FaSearch className="text-gray-400 text-2xl" />} title="No Customers Found" message="Try adjusting your search or filter criteria." />;
    }

    return (
        <div className="overflow-x-auto border rounded-lg shadow max-h-[50vh] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200" id="customer-table">
                <thead className="bg-gray-100 sticky top-0 z-10">
                    <tr>
                        <th className="p-3 text-left text-sm font-semibold text-gray-600 tracking-wider">Sr.No.</th>
                        <th className="p-3 text-left text-sm font-semibold text-gray-600 tracking-wider">Name</th>
                        <th className="p-3 text-right text-sm font-semibold text-gray-600 tracking-wider">येणे</th>
                        <th className="p-3 text-right text-sm font-semibold text-gray-600 tracking-wider">देणे</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {customers.map((c, index) => {
                        const balance = c.balance || 0;
                        const yene = balance > 0 ? balance : 0;
                        const dene = balance < 0 ? Math.abs(balance) : 0;

                        return (
                            <tr
                                key={c._id}
                                className="cursor-pointer hover:bg-purple-50 transition-colors"
                                onClick={() => onSelectCustomer(c)}
                            >
                                <td className="p-3 whitespace-nowrap text-sm text-gray-700">{pageStartIndex + index + 1}</td>
                                <td className="p-3 whitespace-nowrap text-sm font-medium text-gray-900">{c.name}</td>
                                <td className="p-3 whitespace-nowrap text-sm text-green-600 font-medium text-right">{formatCurrency(yene)}</td>
                                <td className="p-3 whitespace-nowrap text-sm text-red-600 font-medium text-right">{formatCurrency(dene)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;

    return (
        <div className="flex justify-between items-center mt-4 print-hidden">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-white border border-gray-300 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Previous
            </button>
            <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
            </span>
            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-white border border-gray-300 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Next
            </button>
        </div>
    );
};

const ReportDetailView = ({ customer, onBack }) => {
    const [reportData, setReportData] = useState({
        balance: 0,
        weekly: { totalIncome: 0, totalProfit: 0 },
        monthly: { totalIncome: 0, totalProfit: 0 },
        yearly: { totalIncome: 0, totalProfit: 0 },
    });
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem("token");

    useEffect(() => {
        const fetchReports = async () => {
            if (!customer) return;
            setLoading(true);
            const today = new Date().toISOString().split("T")[0];
            try {
                const baseReportUrl = `${API_BASE_URI}/api/reports/${customer._id}`;

                const balanceUrl = `${baseReportUrl}/balance`;
                const weeklyUrl = `${baseReportUrl}/weekly-summary`;
                const monthlyUrl = `${baseReportUrl}/monthly-summary`;
                const yearlyUrl = `${baseReportUrl}/yearly-summary`;

                const [balanceRes, weeklyRes, monthlyRes, yearlyRes] = await Promise.all([
                    axios.get(balanceUrl, {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    axios.get(weeklyUrl, {
                        params: { date: today },
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    axios.get(monthlyUrl, {
                        params: { date: today },
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    axios.get(yearlyUrl, {
                        params: { date: today },
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                ]);

                setReportData({
                    balance: balanceRes.data.latestBalance || 0,
                    weekly: weeklyRes.data || { totalIncome: 0, totalProfit: 0 },
                    monthly: monthlyRes.data || { totalIncome: 0, totalProfit: 0 },
                    yearly: yearlyRes.data || { totalIncome: 0, totalProfit: 0 },
                });

            } catch (err) {
                console.error("Failed to fetch reports:", err);
                toast.error(err.response?.data?.message || "Failed to fetch report data.");
            } finally {
                setLoading(false);
            }
        };
        fetchReports();
    }, [customer, token]);

    const yene = reportData.balance > 0 ? reportData.balance : 0;
    const dene = reportData.balance < 0 ? Math.abs(reportData.balance) : 0;

    return (
        <div>
            <button
                onClick={onBack}
                className="flex items-center gap-2 mb-6 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
            >
                <FaArrowLeft /> Back to Customers
            </button>
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">
                Report for <span className="text-purple-600">{customer.name}</span>
            </h2>
            {loading ? (
                <div className="flex justify-center items-center h-48">
                    <FaSpinner className="animate-spin text-purple-600 text-4xl" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Yene/Dene Cards */}
                    <div className="p-6 bg-green-50 border border-green-200 rounded-xl shadow-sm">
                        <h3 className="text-lg font-semibold text-green-800 mb-2">येणे (To Receive)</h3>
                        <p className="text-3xl font-bold text-green-900">{formatCurrency(yene)}</p>
                    </div>
                    <div className="p-6 bg-red-50 border border-red-200 rounded-xl shadow-sm">
                        <h3 className="text-lg font-semibold text-red-800 mb-2">देणे (To Give)</h3>
                        <p className="text-3xl font-bold text-red-900">{formatCurrency(dene)}</p>
                    </div>

                    {/* Report Cards */}
                    <ReportCard
                        title="Weekly Summary"
                        data={reportData.weekly}
                        color="purple"
                    />
                    <ReportCard
                        title="Monthly Summary"
                        data={reportData.monthly}
                        color="blue"
                    />
                    <ReportCard
                        title="Yearly Summary"
                        data={reportData.yearly}
                        color="indigo"
                    />
                </div>
            )}
        </div>
    );
};

const ReportCard = ({ title, data, color }) => {
    const colors = {
        purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', amount: 'text-purple-900' },
        blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', amount: 'text-blue-900' },
        indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-800', amount: 'text-indigo-900' },
    };
    const c = colors[color] || colors.purple;

    return (
        <div className={`p-6 ${c.bg} ${c.border} rounded-xl shadow-sm`}>
            <h3 className={`text-lg font-semibold ${c.text} mb-4`}>{title}</h3>
            <div className="space-y-2">
                <div>
                    <p className={`text-sm font-medium ${c.text}`}>Total Income</p>
                    <p className={`text-2xl font-bold ${c.amount}`}>
                        {formatCurrency(data.totalIncome)}
                    </p>
                </div>
                <div>
                    <p className={`text-sm font-medium ${c.text}`}>Total Profit</p>
                    <p className={`text-2xl font-bold ${c.amount}`}>
                        {formatCurrency(data.totalProfit)}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default function ReportPage() {
    const [allCustomers, setAllCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const debouncedSearch = useDebounce(search, SEARCH_DEBOUNCE_DELAY);

    const fetchCustomers = useCallback(async () => {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem("token");
        if (!token) {
            toast.error("Authentication token not found.");
            setError("Authentication token not found.");
            setLoading(false);
            return;
        }
        try {
            const res = await axios.get(`${API_BASE_URI}/api/customers`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const customerArray = Array.isArray(res.data) ? res.data : res.data.customers;

            if (!Array.isArray(customerArray)) {
                console.error("API did not return an array of customers. Response:", res.data);
                throw new Error("Received invalid data from the server.");
            }

            const sortedCustomers = customerArray.sort((a, b) => (a.srNo || 0) - (b.srNo || 0));

            const normalized = sortedCustomers.map((c) => ({
                ...c,
                _id: typeof c._id === "object" && c._id.$oid ? c._id.$oid : c._id,
                balance: c.balance, // Expecting balance from API
            }));
            setAllCustomers(normalized);
        } catch (err) {
            console.error("Failed to fetch customers:", err);
            const errorMessage = err.response?.data?.message || "Failed to load customers. Please check the connection and try again.";
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCustomers();
    }, [fetchCustomers]);

    const filteredCustomers = useMemo(() => {
        if (!debouncedSearch) return allCustomers;
        return allCustomers.filter(
            (c) =>
                (c.name && c.name.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
                (c.srNo && c.srNo.toString() === debouncedSearch.trim())
        );
    }, [debouncedSearch, allCustomers]);

    const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);
    const pageStartIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentCustomersOnPage = filteredCustomers.slice(
        pageStartIndex,
        pageStartIndex + ITEMS_PER_PAGE
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch]);

    // --- Export Handlers ---

    const handleExportCSV = () => {
        if (allCustomers.length === 0) {
            toast.warn("No customer data to export.");
            return;
        }
        const headers = ["Sr.No.", "Name", "येणे", "देणे"];
        const rows = allCustomers.map(c => {
            const balance = c.balance || 0;
            const yene = balance > 0 ? balance : 0;
            const dene = balance < 0 ? Math.abs(balance) : 0;
            return [c.srNo || 'N/A', `"${c.name}"`, yene.toFixed(2), dene.toFixed(2)].join(',');
        });

        // Add BOM for Excel to recognize UTF-8 characters
        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows].join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "all_customers_balance.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Downloaded all customers as CSV.");
    };

    // PDF Export function removed
    const handleExportPDF = () => {
        toast.error("PDF export is currently unavailable.");
        console.warn("PDF export function called, but PDF libraries are removed.");
    };

    const handlePrint = () => {
        window.print();
    };

    if (error && allCustomers.length === 0) {
        return (
            <div className="bg-white rounded-2xl shadow-xl p-6 max-w-6xl mx-auto space-y-8">
                <EmptyState
                    icon={<FaExclamationCircle className="text-red-500 text-3xl" />}
                    title="Failed to Load Data"
                    message={error}
                    onRetry={fetchCustomers}
                />
            </div>
        );
    }

    return (
        <>
            {/* Print Styles */}
            <style>{`
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
                  }
                  .print-hidden {
                    display: none !important;
                  }
                  @page {
                    size: auto;
                    margin: 0.5in;
                  }
                  table {
                    border-collapse: collapse !important;
                    width: 100% !important;
                  }
                  th, td {
                    border: 1px solid #ddd !important;
                    padding: 8px !important;
                  }
                  thead {
                    background-color: #f4f4f4 !important;
                    -webkit-print-color-adjust: exact;
                    color-adjust: exact;
                  }
                  td.text-green-600 {
                    color: #16a34a !important;
                    -webkit-print-color-adjust: exact;
                    color-adjust: exact;
                  }
                  td.text-red-600 {
                    color: #dc2626 !important;
                    -webkit-print-color-adjust: exact;
                    color-adjust: exact;
                  }
                }
            `}</style>

            <div className="bg-gray-50 min-h-full p-4 sm:p-6 lg:p-8">
                <div className="bg-white rounded-2xl shadow-xl p-6 max-w-6xl mx-auto space-y-6">
                    <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />

                    {!selectedCustomer ? (
                        <div className="printable-area">
                            <h1 className="text-3xl font-bold text-gray-800 print-hidden">Customer Reports</h1>
                            <h1 className="text-3xl font-bold text-gray-800 hidden print:block mb-4">All Customers</h1>

                            {/* Search and Export Buttons */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4 print-hidden">
                                <div className="relative">
                                    <FaSearch className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search by name or Sr.No."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="border border-gray-300 rounded-lg py-2 pl-10 pr-4 w-full focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow"
                                    />
                                </div>
                                <div className="flex flex-wrap gap-2 justify-start md:justify-end">
                                    <button
                                        onClick={handleExportCSV}
                                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                                    >
                                        <FaFileCsv /> Export CSV
                                    </button>
                                    {/* ## UPDATED: PDF Button removed ## */}
                                    {/* <button
                                        onClick={handleExportPDF}
                                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium opacity-50 cursor-not-allowed"
                                        title="PDF export is currently unavailable"
                                    >
                                        <FaFilePdf /> Export PDF
                                    </button> */}
                                    <button
                                        onClick={handlePrint}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                    >
                                        <FaPrint /> Print
                                    </button>
                                </div>
                            </div>

                            <div className="print-hidden">
                                <CustomerTable
                                    customers={currentCustomersOnPage}
                                    onSelectCustomer={setSelectedCustomer}
                                    loading={loading && allCustomers.length === 0}
                                    pageStartIndex={pageStartIndex}
                                />
                            </div>

                            <div className="hidden print:block">
                                <h2 className="text-xl font-semibold mb-2">All Customers</h2>
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="p-3 text-left text-sm font-semibold text-gray-600 tracking-wider">Sr.No.</th>
                                            <th className="p-3 text-left text-sm font-semibold text-gray-600 tracking-wider">Name</th>
                                            <th className="p-3 text-right text-sm font-semibold text-gray-600 tracking-wider">येणे</th>
                                            <th className="p-3 text-right text-sm font-semibold text-gray-600 tracking-wider">देणे</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {allCustomers.map((c) => {
                                            const balance = c.balance || 0;
                                            const yene = balance > 0 ? balance : 0;
                                            const dene = balance < 0 ? Math.abs(balance) : 0;
                                            return (
                                                <tr key={c._id}>
                                                    <td className="p-3 whitespace-nowrap text-sm text-gray-700">{c.srNo}</td>
                                                    <td className="p-3 whitespace-nowrap text-sm font-medium text-gray-900">{c.name}</td>
                                                    <td className="p-3 whitespace-nowrap text-sm text-green-600 text-right">{formatCurrency(yene)}</td>
                                                    <td className="p-3 whitespace-nowrap text-sm text-red-600 text-right">{formatCurrency(dene)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                            />
                        </div>
                    ) : (
                        <ReportDetailView
                            customer={selectedCustomer}
                            onBack={() => setSelectedCustomer(null)}
                        />
                    )}
                </div>
            </div>
        </>
    );
}

