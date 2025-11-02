import React, { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import {
    Search, Loader2, AlertCircle, FileText, Printer,
    CalendarRange, Calendar, LineChart
} from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
// Note: "react-toastify/dist/ReactToastify.css" is assumed to be imported at the root (e.g., index.js or App.js)

// --- Constants ---
const API_BASE_URI = "https://game-book.onrender.com";
const ITEMS_PER_PAGE = 10;
const SEARCH_DEBOUNCE_DELAY = 300;

// --- Custom Hook for Debouncing ---
const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
};

// --- Helper to format currency ---
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
    }).format(amount || 0);
};

// --- UI Sub-components ---

const SummaryCard = ({ title, value, icon, color, loading }) => {
    const colors = {
        purple: 'from-purple-500 to-purple-600',
        blue: 'from-blue-500 to-blue-600',
        green: 'from-green-500 to-green-600',
    };
    return (
        <div className={`p-6 rounded-2xl text-white shadow-lg bg-gradient-to-br ${colors[color]}`}>
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-lg font-medium opacity-80">{title}</p>
                    {loading ? (
                        <div className="h-8 w-32 bg-white/30 rounded-md animate-pulse mt-1"></div>
                    ) : (
                        <p className="text-3xl font-bold tracking-tight">{formatCurrency(value)}</p>
                    )}
                </div>
                <div className="text-4xl opacity-50">{icon}</div>
            </div>
        </div>
    );
};

const ProfitLossCard = ({ title, value, loading }) => {
    const isProfit = value >= 0;
    const bgColor = isProfit ? 'bg-green-50' : 'bg-red-50';
    const textColor = isProfit ? 'text-green-800' : 'text-red-800';
    const amountColor = isProfit ? 'text-green-900' : 'text-red-900';

    return (
        <div className={`p-6 rounded-2xl shadow-lg ${bgColor} border ${isProfit ? 'border-green-200' : 'border-red-200'}`}>
            <div className="flex justify-between items-start">
                <div>
                    <p className={`text-lg font-medium ${textColor}`}>{title}</p>
                    {loading ? (
                        <div className="h-8 w-32 bg-gray-300 rounded-md animate-pulse mt-1"></div>
                    ) : (
                        <p className={`text-3xl font-bold tracking-tight ${amountColor}`}>{formatCurrency(value)}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

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
        <div className="flex justify-center items-center mx-auto w-16 h-16 bg-gray-100 rounded-full">{icon}</div>
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

// --- UPDATED: CustomerTable now accepts totalYene and totalDene ---
const CustomerTable = ({ customers, loading, pageStartIndex, totalYene, totalDene }) => {
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
        return <EmptyState icon={<Search className="text-gray-400 text-2xl" />} title="No Customers Found" message="Try adjusting your search or filter criteria." />;
    }

    return (
        <div className="overflow-x-auto border rounded-lg shadow max-h-[60vh] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200" id="customer-table">
                <thead className="bg-gray-100 sticky top-0 z-10">
                    <tr>
                        <th className="p-3 text-left text-sm font-semibold text-gray-600 tracking-wider">Sr.No.</th>
                        <th className="p-3 text-left text-sm font-semibold text-gray-600 tracking-wider">Name</th>
                        <th className="p-3 text-right text-sm font-semibold text-gray-600 tracking-wider">येणे (To Receive)</th>
                        <th className="p-3 text-right text-sm font-semibold text-gray-600 tracking-wider">देणे (To Give)</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {customers.map((c, index) => {
                        const finalTotal = c.latestBalance || 0;
                        const yene = finalTotal > 0 ? finalTotal : 0;
                        const dene = finalTotal < 0 ? Math.abs(finalTotal) : 0;

                        return (
                            <tr key={c._id} className="hover:bg-purple-50 transition-colors">
                                <td className="p-3 whitespace-nowrap text-sm text-gray-700">{pageStartIndex + index + 1}</td>
                                <td className="p-3 whitespace-nowrap text-sm font-medium text-gray-900">{c.name}</td>
                                <td className="p-3 whitespace-nowrap text-sm text-green-600 font-medium text-right">{formatCurrency(yene)}</td>
                                <td className="p-3 whitespace-nowrap text-sm text-red-600 font-medium text-right">{formatCurrency(dene)}</td>
                            </tr>
                        );
                    })}
                </tbody>
                {/* --- NEW: Added Table Footer for Totals --- */}
                <tfoot className="bg-gray-100 sticky bottom-0 z-10 border-t-2 border-gray-300">
                    <tr className="font-bold text-gray-900">
                        <td className="p-3 text-left" colSpan="2">
                            Total
                        </td>
                        <td className="p-3 text-right text-green-700">
                            {formatCurrency(totalYene)}
                        </td>
                        <td className="p-3 text-right text-red-700">
                            {formatCurrency(totalDene)}
                        </td>
                    </tr>
                </tfoot>
                {/* --- END NEW --- */}
            </table>
        </div>
    );
};

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;

    return (
        <div className="flex justify-between items-center mt-4 print-hidden">
            <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="px-4 py-2 bg-white border border-gray-300 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50">Previous</button>
            <span className="text-sm text-gray-700">Page {currentPage} of {totalPages}</span>
            <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="px-4 py-2 bg-white border border-gray-300 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50">Next</button>
        </div>
    );
};

export default function ReportPage() {
    const [allCustomers, setAllCustomers] = useState([]);
    const [summary, setSummary] = useState({
        weekly: { income: 0, profit: 0 },
        monthly: { income: 0, profit: 0 },
        yearly: { income: 0, profit: 0 }
    });
    const [loading, setLoading] = useState(true);
    const [summaryLoading, setSummaryLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const debouncedSearch = useDebounce(search, SEARCH_DEBOUNCE_DELAY);
    const token = localStorage.getItem("token");

    const fetchData = useCallback(async () => {
        setLoading(true);
        setSummaryLoading(true);
        setError(null);
        if (!token) {
            const msg = "Authentication token not found.";
            toast.error(msg);
            setError(msg);
            setLoading(false);
            setSummaryLoading(false);
            return;
        }

        try {
            const cacheBust = `_=${new Date().getTime()}`;
            const config = {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                }
            };

            const [customerRes, weeklyRes, monthlyRes, yearlyRes] = await Promise.all([
                axios.get(`${API_BASE_URI}/api/reports/customers/all-balances?${cacheBust}`, config),
                axios.get(`${API_BASE_URI}/api/reports/summary/weekly?${cacheBust}`, config),
                axios.get(`${API_BASE_URI}/api/reports/summary/monthly?${cacheBust}`, config),
                axios.get(`${API_BASE_URI}/api/reports/summary/yearly?${cacheBust}`, config),
            ]);

            setAllCustomers(customerRes.data);
            setSummary({
                weekly: { 
                    income: weeklyRes.data.totalIncome || 0, 
                    profit: weeklyRes.data.totalProfit || 0 
                },
                monthly: { 
                    income: monthlyRes.data.totalIncome || 0, 
                    profit: monthlyRes.data.totalProfit || 0 
                },
                yearly: { 
                    income: yearlyRes.data.totalIncome || 0, 
                    profit: yearlyRes.data.totalProfit || 0 
                },
            });

        } catch (err) {
            console.error("Failed to fetch data:", err);
            const errorMessage = err.response?.data?.message || "Failed to load data. Please try again.";
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
            setSummaryLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // --- UPDATED: This useMemo now returns all total values ---
    const { netBalance, totalYene, totalDene } = useMemo(() => {
        let yene = 0;
        let dene = 0;
        
        allCustomers.forEach(c => {
            const balance = c.latestBalance || 0;
            if (balance > 0) {
                yene += balance;
            } else if (balance < 0) {
                dene += Math.abs(balance);
            }
        });

        return {
            totalYene: yene,
            totalDene: dene,
            netBalance: yene - dene
        };
    }, [allCustomers]);

    const filteredCustomers = useMemo(() => {
        if (!debouncedSearch) return allCustomers;
        return allCustomers.filter(c =>
            (c.name && c.name.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
            (c.srNo && c.srNo.toString() === debouncedSearch.trim())
        );
    }, [debouncedSearch, allCustomers]);

    const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);
    const pageStartIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentCustomersOnPage = filteredCustomers.slice(pageStartIndex, pageStartIndex + ITEMS_PER_PAGE);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch]);

    const handleExportCSV = () => {
        if (allCustomers.length === 0) {
            toast.warn("No customer data to export.");
            return;
        }
        // --- ADDED TOTALS ROW ---
        const headers = ["Sr.No.", "Name", "येणे (To Receive)", "देणे (To Give)"];
        const rows = allCustomers.map(c => {
            const finalTotal = c.latestBalance || 0;
            const yene = finalTotal > 0 ? finalTotal : 0;
            const dene = finalTotal < 0 ? Math.abs(finalTotal) : 0;
            return [c.srNo || 'N/A', `"${c.name}"`, yene.toFixed(2), dene.toFixed(2)].join(',');
        });
        
        // Add the total row to the CSV
        const totalRow = ["Total", "", totalYene.toFixed(2), totalDene.toFixed(2)].join(',');
        rows.push(totalRow);
        // --- END ADD ---

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

    const handlePrint = () => window.print();

    if (error && allCustomers.length === 0) {
        return (
            <div className="bg-white rounded-2xl shadow-xl p-6 max-w-7xl mx-auto">
                <EmptyState icon={<AlertCircle className="text-red-500 text-3xl" />} title="Failed to Load Data" message={error} onRetry={fetchData} />
            </div>
        );
    }

    return (
        <>
            {/* --- FIXED: Completed the style block --- */}
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    .printable-area, .printable-area * { visibility: visible; }
                    .printable-area { position: absolute; left: 0; top: 0; width: 100%; }
                    .print-hidden { display: none !important; }
                    @page { size: auto; margin: 0.5in; }
                    table { border-collapse: collapse !important; width: 100% !important; }
                    th, td { border: 1px solid #ddd !important; padding: 8px !important; }
                    thead, tfoot { background-color: #f4f4f4 !important; -webkit-print-color-adjust: exact; color-adjust: exact; }
                    td.text-green-600, td.text-green-700 { color: #16a34a !important; -webkit-print-color-adjust: exact; color-adjust: exact; }
                    td.text-red-600, td.text-red-700 { color: #dc2626 !important; -webkit-print-color-adjust: exact; color-adjust: exact; }
                }
            `}</style>
            {/* --- END FIX --- */}

            <div className="bg-gray-50 min-h-full p-4 sm:p-6 lg:p-8">
                <div className="bg-white rounded-2xl shadow-xl p-6 max-w-7xl mx-auto space-y-6">
                    <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
                    <div className="printable-area">
                        <h1 className="text-3xl font-bold text-gray-800 mb-6">Reports Dashboard</h1>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4 print-hidden">
                            <SummaryCard title="This Week's Income" value={summary.weekly.income} icon={<CalendarRange />} color="purple" loading={summaryLoading} />
                            <SummaryCard title="This Month's Income" value={summary.monthly.income} icon={<Calendar />} color="blue" loading={summaryLoading} />
                            <SummaryCard title="This Year's Income" value={summary.yearly.income} icon={<LineChart />} color="green" loading={summaryLoading} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 print-hidden">
                             <ProfitLossCard title="Weekly Profit/Loss" value={summary.weekly.profit} loading={summaryLoading} />
                             <ProfitLossCard title="Monthly Profit/Loss" value={summary.monthly.profit} loading={summaryLoading} />
                             <ProfitLossCard title="Yearly Profit/Loss" value={summary.yearly.profit} loading={summaryLoading} />
                             <ProfitLossCard title="Net Customer Balance" value={netBalance} loading={loading} />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4 print-hidden">
                            <div className="relative">
                                <Search className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
                                <input type="text" placeholder="Search by name or Sr.No." value={search} onChange={(e) => setSearch(e.target.value)} className="border border-gray-300 rounded-lg py-2 pl-10 pr-4 w-full focus:outline-none focus:ring-2 focus:ring-purple-500" />
                            </div>
                            <div className="flex flex-wrap gap-2 justify-start md:justify-end">
                                <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"><FileText /> Export CSV</button>
                                <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"><Printer /> Print</button>
                            </div>
                        </div>
                        
                        <div className="print-hidden">
                            <CustomerTable 
                                customers={currentCustomersOnPage} 
                                loading={loading && allCustomers.length === 0} 
                                pageStartIndex={pageStartIndex}
                                totalYene={totalYene} 
                                totalDene={totalDene}
                            />
                        </div>
                        
                        {/* This table is only for printing. It shows ALL customers. */}
                        <div className="hidden print:block">
                            <h2 className="text-xl font-semibold mb-2">All Customers Balance</h2>
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
                                        const finalTotal = c.latestBalance || 0;
                                        const yene = finalTotal > 0 ? finalTotal : 0;
                                        const dene = finalTotal < 0 ? Math.abs(finalTotal) : 0;
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
                                <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                                    <tr className="font-bold text-gray-900">
                                        <td className="p-3 text-left" colSpan="2">
                                            Total
                                        </td>
                                        <td className="p-3 text-right text-green-700">
                                            {formatCurrency(totalYene)}
                                        </td>
                                        <td className="p-3 text-right text-red-700">
                                            {formatCurrency(totalDene)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                    </div>
                </div>
            </div>
        </>
    );
}

