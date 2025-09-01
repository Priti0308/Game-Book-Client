import React, { useState, useEffect, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import dayjs from "dayjs";

const ReceiptForm = () => {
  const [formData, setFormData] = useState(() => {
    const savedData = localStorage.getItem("receiptData");
    return savedData
      ? JSON.parse(savedData)
      : {
          businessName: "फ्रेंडशिप",
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
          isEditing: true,
        };
  });
  const [isEditing, setIsEditing] = useState(formData.isEditing);
  const [error, setError] = useState(null);
  const componentRef = useRef();

  useEffect(() => {
    // Fetch initial data from backend
    fetch("http://localhost:5000/receipt")
      .then((res) => res.json())
      .then((data) => {
        if (data) setFormData((prev) => ({ ...prev, ...data, isEditing: false }));
      })
      .catch((err) => setError("Failed to fetch receipt data"));

    const totalIncome = Number(formData.morningIncome) + Number(formData.eveningIncome);
    const deduction = totalIncome * 0.1; // 10% commission
    const afterDeduction = totalIncome - deduction;
    const remainingBalance = afterDeduction - Number(formData.payment);
    const finalTotal = remainingBalance + Number(formData.pendingAmount);
    const totalReceived = deduction + Number(formData.payment);
    const totalWithAdvance = totalReceived + Number(formData.advanceAmount);

    setFormData((prev) => ({
      ...prev,
      totalIncome: isNaN(totalIncome) ? "" : totalIncome,
      deduction: isNaN(deduction) ? "" : deduction.toFixed(2),
      afterDeduction: isNaN(afterDeduction) ? "" : afterDeduction,
      remainingBalance: isNaN(remainingBalance) ? "" : remainingBalance,
      finalTotal: isNaN(finalTotal) ? "" : finalTotal,
      totalReceived: isNaN(totalReceived) ? "" : totalReceived,
      totalWithAdvance: isNaN(totalWithAdvance) ? "" : totalWithAdvance,
    }));

    if (!isEditing) {
      localStorage.setItem("receiptData", JSON.stringify(formData));
    }
  }, [formData.morningIncome, formData.eveningIncome, formData.payment, formData.pendingAmount, formData.advanceAmount, isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = () => {
    fetch("http://localhost:5000/receipt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    })
      .then((res) => {
        if (res.ok) {
          setIsEditing(false);
          alert("Data saved successfully!");
        } else {
          throw new Error("Failed to save data");
        }
      })
      .catch((err) => {
        setError("Error saving data");
        alert("Failed to save data. Please try again.");
      });
  };

  const handleEdit = () => {
    setIsEditing(true);
    setFormData((prev) => ({ ...prev, isEditing: true }));
    alert("Edit mode enabled!");
  };

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: "Receipt.pdf",
    pageStyle: `@page { margin: 0mm; } @media print { body { margin: 0; } }`,
    onAfterPrint: () => alert("PDF printed successfully!"),
  });

  return (
    <div>
      <div ref={componentRef} className="sheet">
        <div className="title">
          {isEditing ? (
            <input
              type="text"
              name="businessName"
              value={formData.businessName}
              onChange={handleChange}
              style={{ width: "150px", border: "none", textAlign: "center", fontSize: "18px", fontWeight: "bold" }}
            />
          ) : (
            formData.businessName
          )}
        </div>
        <div className="top-section">
          <div className="left">
            नांव:- {isEditing ? (
              <input
                type="text"
                name="customerName"
                value={formData.customerName}
                onChange={handleChange}
                style={{ width: "100px", border: "none", textAlign: "left", fontSize: "14px" }}
              />
            ) : (
              formData.customerName
            )}
          </div>
          <div className="right">
            <div>वार:- {formData.day}</div>
            <div>दि:- {formData.date}</div>
          </div>
        </div>

        <table className="receipt-table">
          <thead>
            <tr>
              <th>ओ.</th>
              <th>रक्कम</th>
              <th>ओ.</th>
              <th>जोड</th>
              <th>को.</th>
              <th>पान</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>आ.</td>
              <td className="amount">
                {isEditing ? (
                  <input
                    type="text"
                    name="morningIncome"
                    value={formData.morningIncome}
                    onChange={handleChange}
                    style={{ width: "80px", border: "none", textAlign: "right", fontSize: "14px" }}
                  />
                ) : (
                  formData.morningIncome
                )}
              </td>
              {/* <td>आ.</td>
              <td className="amount">{formData.deduction}</td>
              <td>को.</td>
              <td></td> */}
              <td></td>
              <td ></td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td>कु.</td>
              <td className="amount">
                {isEditing ? (
                  <input
                    type="text"
                    name="eveningIncome"
                    value={formData.eveningIncome}
                    onChange={handleChange}
                    style={{ width: "80px", border: "none", textAlign: "right", fontSize: "14px" }}
                  />
                ) : (
                  formData.eveningIncome
                )}
              </td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td>टो.</td>
              <td className="amount">{formData.totalIncome}</td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td>क.</td>
              <td className="amount">{formData.deduction}</td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td>टो.</td>
              <td className="amount">{formData.afterDeduction}</td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td>पें.</td>
              <td className="amount">
                {isEditing ? (
                  <input
                    type="text"
                    name="payment"
                    value={formData.payment}
                    onChange={handleChange}
                    style={{ width: "80px", border: "none", textAlign: "right", fontSize: "14px" }}
                  />
                ) : (
                  formData.payment
                )}
              </td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td>टो.</td>
              <td className="amount">{formData.remainingBalance}</td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td>मा.</td>
              <td className="amount">
                {isEditing ? (
                  <input
                    type="text"
                    name="pendingAmount"
                    value={formData.pendingAmount}
                    onChange={handleChange}
                    style={{ width: "80px", border: "none", textAlign: "right", fontSize: "14px" }}
                  />
                ) : (
                  formData.pendingAmount
                )}
              </td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td>टो.</td>
              <td className="amount">{formData.finalTotal}</td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          </tbody>
        </table>

        <div className="bottom">
          <div className="bottom-left"></div>
          <div className="bottom-right">
            <div>
              आड:- {isEditing ? (
                <input
                  type="text"
                  name="advanceAmount"
                  value={formData.advanceAmount}
                  onChange={handleChange}
                  style={{ width: "80px", border: "none", textAlign: "right", fontSize: "14px" }}
                />
              ) : (
                formData.advanceAmount
              )}
            </div>
            <div>टो:- {formData.totalWithAdvance}</div>
          </div>
        </div>

        <style>{`
          .sheet {
            width: 420px;
            border: 1.5px solid #000;
            padding: 8px;
            font-family: "Noto Serif Devanagari", Arial, sans-serif;
            font-size: 14px;
            box-sizing: border-box;
          }
          .title {
            text-align: center;
            font-weight: bold;
            margin-bottom: 5px;
            font-size: 18px;
          }
          .top-section {
            display: flex;
            border: 1.5px solid #000;
            margin-bottom: 8px;
          }
          .left {
            flex: 1.6;
            border-right: 1.5px solid #000;
            padding: 4px;
          }
          .right {
            flex: 1;
            display: flex;
            flex-direction: column;
          }
          .right div {
            flex: 1;
            border-top: 1.5px solid #000;
            padding: 4px;
          }
          .right div:first-child {
            border-top: none;
          }
          .receipt-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
          }
          .receipt-table th, .receipt-table td {
            border: 1.5px solid #000;
            padding: 4px;
            height: 28px;
            text-align: left;
          }
          .receipt-table th {
            font-weight: bold;
            text-align: center;
          }
          .amount {
            text-align: right;
            width: 90px;
          }
          .bottom {
            display: flex;
          }
          .bottom-left {
            flex: 1.3;
            border: 1.5px solid #000;
            height: 70px;
            padding: 4px;
          }
          .bottom-right {
            flex: 1;
            display: flex;
            flex-direction: column;
          }
          .bottom-right div {
            flex: 1;
            border: 1.5px solid #000;
            border-left: none;
            padding: 4px;
          }
          input {
            background: transparent;
            border: none;
            font-family: "Noto Serif Devanagari", Arial, sans-serif;
            font-size: 14px;
          }
          .button-group {
            margin-top: 10px;
            display: flex;
            gap: 10px;
          }
          .button-group button {
            padding: 8px 16px;
            font-size: 14px;
            cursor: pointer;
            border: none;
            border-radius: 4px;
          }
          .button-group .save-btn {
            background-color: #4CAF50;
            color: white;
          }
          .button-group .edit-btn {
            background-color: #2196F3;
            color: white;
          }
          .button-group .pdf-btn {
            background-color: #ff0000;
            color: white;
          }
          .button-group button:disabled {
            background-color: #cccccc;
            cursor: not-allowed;
          }
          @media print {
            body, html { margin: 0; padding: 0; background: #fff; }
            .sheet { border: none; }
            .button-group { display: none; }
            input { border: none; }
          }
        `}</style>
      </div>
      <div className="button-group">
        {isEditing ? (
          <button className="save-btn" onClick={handleSave}>Save</button>
        ) : (
          <button className="edit-btn" onClick={handleEdit}>Edit</button>
        )}
        <button className="pdf-btn" onClick={handlePrint}>Print/Download PDF</button>
      </div>
      {error && <div style={{ color: "red" }}>{error}</div>}
    </div>
  );
};

export default ReceiptForm;