import React, { useState, useEffect } from "react";
import axios from "axios";
import dayjs from "dayjs"; // Import dayjs to check dates
import { toast, ToastContainer } from "react-toastify";
import {
  FaSpinner,
  FaExclamationCircle,
  FaSave,
  FaUndo,
  FaSearch,
} from "react-icons/fa";
import "react-toastify/dist/ReactToastify.css";

const API_BASE_URI = "https://game-book.onrender.com"; // Your backend URL

// --- HELPER FUNCTION to calculate string expressions ---
const evaluateExpression = (expression) => {
  if (typeof expression !== "string" || !expression.trim()) {
    return 0;
  }
  try {
    // 1. Remove any invalid characters (keep only digits, +, -, *, /)
    let sanitized = expression.replace(/[^0-9+\-*/.]/g, "");
    // 2. Remove any trailing operator to prevent errors
    sanitized = sanitized.replace(/[+\-*/.]+$/, "");
    if (!sanitized) return 0;

    // 3. Use eval to calculate the result
    // eslint-disable-next-line no-eval
    const result = eval(sanitized);
    return isFinite(result) ? result : 0;
  } catch (error) {
    return 0;
  }
};

const Shortcut = () => {
  const [customerIncomes, setCustomerIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState(""); // --- NEW: State for search filter
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
          axios.get(`${API_BASE_URI}/api/receipts`, config),
        ]);

        const customerData =
          customerResponse.data.customers || customerResponse.data;
        const allReceipts =
          receiptResponse.data.receipts || receiptResponse.data;

        // 2. Filter receipts to find only today's receipts
        const todayStr = dayjs().format("YYYY-MM-DD");
        const todaysReceipts = allReceipts.filter(
          (r) => dayjs(r.date).format("YYYY-MM-DD") === todayStr
        );

        // 3. Map over customers and merge data from today's receipts
        const initialData = customerData
          // --- THIS IS THE CORRECTED SORTING LOGIC ---
          .sort((a, b) => {
            const srA = Number(a.srNo);
            const srB = Number(b.srNo);

            // Check if values are valid, finite numbers
            const aIsNum = !isNaN(srA) && isFinite(srA);
            const bIsNum = !isNaN(srB) && isFinite(srB);

            if (aIsNum && bIsNum) {
              // Both are valid numbers, sort them
              return srA - srB;
            } else if (aIsNum) {
              // Only A is a number, so it comes first
              return -1;
            } else if (bIsNum) {
              // Only B is a number, so it comes first
              return 1;
            } else {
              // Neither is a valid number, keep their original order
              return 0;
            }
          })
          // --- END OF SORTING FIX ---
          .map((customer) => {
            // Find this customer's receipt for today, if one exists
            const receipt = todaysReceipts.find(
              (r) => r.customerId === customer._id
            );

            // Find the 'aamdan' (आ.) row from that receipt
            const aamdanRow = receipt?.gameRows?.find(
              (row) => row.type === "आ."
            );
            // Find the 'kulan' (कु.) row from that receipt
            const kulanRow = receipt?.gameRows?.find(
              (row) => row.type === "कु."
            );

            // --- 
            // --- 
            // --- CHANGE 2 (Part A): Read the expression from the DB ---
            // --- 
            // --- 
            // We now check for 'incomeExpression' first.
            // If it exists, we use it.
            // If not, we fall back to the 'income' (the calculated number).
            return {
              ...customer,
              aamdanIncome:
                aamdanRow?.incomeExpression || aamdanRow?.income?.toString() || "",
              kulanIncome:
                kulanRow?.incomeExpression || kulanRow?.income?.toString() || "",
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

  // --- UPDATED: Handle string expressions ---
  const handleInputChange = (customerId, field, value) => {
    // 1. Remove any characters that are NOT a digit, a plus sign, or a space
    const sanitizedValue = value.replace(/[^0-9+ ]/g, "");

    // 2. Replace all spaces with '+' and collapse multiple '++' into one '+'
    const formattedValue = sanitizedValue
      .replace(/ /g, "+")
      .replace(/\+{2,}/g, "+");

    setCustomerIncomes((prevIncomes) =>
      prevIncomes.map((customer) =>
        customer._id === customerId
          ? { ...customer, [field]: formattedValue } // Store the formatted string
          : customer
      )
    );
  };

  // --- NEW: Handle clearing all income fields ---
  const handleClearIncomes = () => {
    setCustomerIncomes((prevIncomes) =>
      prevIncomes.map((customer) => ({
        ...customer,
        aamdanIncome: "",
        kulanIncome: "",
      }))
    );
    toast.info("All income fields cleared.");
  };

  // --- UPDATED: Evaluate expressions before saving ---
  const handleSave = async () => {
    const dataToSave = customerIncomes
      .filter((c) => c.aamdanIncome || c.kulanIncome) // Only include customers with entered income
      .map((c) => ({
        customerId: c._id,
        // ---
        // ---
        // --- CHANGE 2 (Part B): Send BOTH the expression and the result ---
        // ---
        // ---
        // We still send the calculated number as 'aamdanIncome'
        aamdanIncome: evaluateExpression(c.aamdanIncome),
        kulanIncome: evaluateExpression(c.kulanIncome),
        // We ALSO send the raw string expression
        aamdanIncomeExpression: c.aamdanIncome || "",
        kulanIncomeExpression: c.kulanIncome || "",
      }));

    if (dataToSave.length === 0) {
      toast.warn("Please enter an income for at least one customer.");
      return;
    }

    setSaving(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      // This endpoint is correct. Your backend will handle creating/updating the receipt.
      await axios.post(
        `${API_BASE_URI}/api/shortcuts/income`,
        dataToSave,
        config
      );
      toast.success("Incomes saved successfully!");

      // SUCCESS! The state (customerIncomes) still holds the expressions,
      // so they will remain visible in the input boxes.
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save incomes.");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="p-8 text-center">
        <FaSpinner className="animate-spin text-purple-600 text-4xl mx-auto" />
      </div>
    );
  if (error)
    return (
      <div className="p-8 text-center text-red-600">
        <FaExclamationCircle className="mx-auto text-4xl mb-2" />
        {error}
      </div>
    );

  // --- NEW: Filter customers based on search query before rendering ---
  const filteredCustomers = customerIncomes.filter(
    (customer) =>
      // Check name (case-insensitive)
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      // Check srNo (case-insensitive, after converting to string)
      (customer.srNo &&
        customer.srNo
          .toString()
          .toLowerCase()
          .includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-full">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
      />
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-6">
        {/* --- THIS IS THE UPDATED HEADER --- */}
        {/* Row 1: Title */}
        <div className="flex items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-800">
            Manual Income Entry
          </h1>
        </div>

        {/* Row 2: Controls (Search, Clear, Save) */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          {/* Search Input */}
          <div className="relative flex-grow sm:flex-grow-0 sm:w-64">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <FaSearch className="text-gray-400" />
            </span>
            <input
              type="text"
              placeholder="Search by Sr.No or Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-2 pl-10 border rounded-md focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          {/* Spacer to push buttons to the right */}
          <div className="flex-grow"></div>

          {/* Button Group */}
          <div className="flex items-center gap-2">
            {/* Clear Button */}
            <button
              onClick={handleClearIncomes}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg shadow-md hover:bg-gray-600 disabled:opacity-50 transition-colors"
            >
              <FaUndo size="0.9em" />
              Clear
            </button>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
              {saving ? "Saving..." : "Save Incomes"}
            </button>
          </div>
        </div>
        {/* --- END OF UPDATED HEADER --- */}

        <div className="overflow-x-auto border rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left text-sm font-semibold text-gray-600 w-16">
                  Sr.No.
                </th>
                <th className="p-3 text-left text-sm font-semibold text-gray-600">
                  Name
                </th>
                {/* --- UPDATED: Column Name --- */}
                <th className="p-3 text-left text-sm font-semibold text-gray-600">
                  Open
                </th>
                {/* --- UPDATED: Column Name --- */}
                <th className="p-3 text-left text-sm font-semibold text-gray-600">
                  Close
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* ---
                ---
                --- CHANGE 1: Using 'index' for sequential Sr.No. ---
                ---
                --- */}
              {filteredCustomers.map((customer, index) => (
                <tr key={customer._id}>
                  <td className="p-2 text-sm text-gray-700 text-center">
                    {index + 1}
                  </td>
                  <td className="p-2 text-sm font-medium text-gray-900">
                    {customer.name}
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      // inputMode="numeric" // Keep inputMode as text to allow '+'
                      value={customer.aamdanIncome}
                      onChange={(e) =>
                        handleInputChange(
                          customer._id,
                          "aamdanIncome",
                          e.target.value
                        )
                      }
                      className="w-full p-2 border rounded-md focus:ring-purple-500 focus:border-purple-500 text-right"
                      placeholder="e.g. 100+50"
                    />
                    {/* --- NEW: Live total display --- */}
                    <div className="text-right text-sm font-medium text-gray-600 pr-1 mt-1">
                      = {evaluateExpression(customer.aamdanIncome)}
                    </div>
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      // inputMode="numeric"
                      value={customer.kulanIncome}
                      onChange={(e) =>
                        handleInputChange(
                          customer._id,
                          "kulanIncome",
                          e.target.value
                        )
                      }
                      className="w-full p-2 border rounded-md focus:ring-purple-500 focus:border-purple-500 text-right"
                      placeholder="e.g. 100+50"
                    />
                    {/* --- NEW: Live total display --- */}
                    <div className="text-right text-sm font-medium text-gray-600 pr-1 mt-1">
                      = {evaluateExpression(customer.kulanIncome)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* --- REMOVED: Button from bottom --- */}
      </div>
    </div>
  );
};

export default Shortcut;