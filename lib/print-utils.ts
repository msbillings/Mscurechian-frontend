export const generatePayslipHtml = (data: any) => {
  const { payroll, hospital } = data;
  const staff = data.staff || payroll?.user || {};
  const rx = payroll || {};
  const u = staff;
  const h = hospital || {
    name: "Institutional Healthcare",
    address: "Hospital Complex",
    phone: "91-0000000000",
    email: "admin@hospital.com",
    logo: "",
  };
  const b = rx.breakdown || {};
  const c = rx.ctc || {};

  const totalGross =
    (b.basic || 0) +
    (b.hra || 0) +
    (b.transportAllowance || 0) +
    (b.medicalAllowance || 0) +
    (b.specialAllowance || 0) +
    (b.bonus || 0) +
    (b.salaryArrears || 0);
  const totalDeducts =
    (b.pf || 0) +
    (b.esi || 0) +
    (b.professionalTax || 0) +
    (b.tds || 0) +
    (b.salaryAdvance || 0);
  const netSalary = rx.netSalary || totalGross - totalDeducts;

  const monthName = rx.startDate
    ? new Date(rx.startDate).toLocaleString("default", {
        month: "short",
        year: "numeric",
      })
    : "Pay Period";
  const fullPeriod =
    rx.startDate && rx.endDate
      ? `(From ${new Date(rx.startDate).toLocaleDateString("en-GB")} To ${new Date(rx.endDate).toLocaleDateString("en-GB")})`
      : "";

  // Number to words function
  const numberToWords = (num: number): string => {
    if (num === 0) return "Zero Only";
    const a = [
      "",
      "One ",
      "Two ",
      "Three ",
      "Four ",
      "Five ",
      "Six ",
      "Seven ",
      "Eight ",
      "Nine ",
      "Ten ",
      "Eleven ",
      "Twelve ",
      "Thirteen ",
      "Fourteen ",
      "Fifteen ",
      "Sixteen ",
      "Seventeen ",
      "Eighteen ",
      "Nineteen ",
    ];
    const b = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ];

    const inWords = (n: any): string => {
      if (n < 20) return a[n];
      if (n < 100)
        return b[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + a[n % 10] : "");
      if (n < 1000)
        return (
          a[Math.floor(n / 100)] +
          "Hundred " +
          (n % 100 !== 0 ? "and " + inWords(n % 100) : "")
        );
      return "";
    };

    const convert = (n: number) => {
      let str = "";
      const crores = Math.floor(n / 10000000);
      n %= 10000000;
      if (crores > 0) str += inWords(crores) + "Crore ";

      const lakhs = Math.floor(n / 100000);
      n %= 100000;
      if (lakhs > 0) str += inWords(lakhs) + "Lakh ";

      const thousands = Math.floor(n / 1000);
      n %= 1000;
      if (thousands > 0) str += inWords(thousands) + "Thousand ";

      if (n > 0) str += inWords(n);
      return str.trim();
    };

    return convert(Math.floor(num)) + " Only";
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Pay Slip - ${u.name || "Employee"}</title>
      <meta charset="UTF-8">
      <style>
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
          }
        }
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: #000;
          line-height: 1.3;
          margin: 0;
          padding: 8mm;
          background: white;
          font-size: 11px;
        }
        .container {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          padding: 8mm;
          box-sizing: border-box;
        }
        .header {
          text-align: center;
          margin-bottom: 12px;
        }
        .hospital-name {
          font-size: 22px;
          font-weight: bold;
          text-transform: uppercase;
          margin: 0;
        }
        .hospital-info {
          font-size: 11px;
          margin: 2px 0;
          color: #555;
        }
        .pay-slip-title {
          font-size: 14px;
          font-weight: bold;
          text-transform: uppercase;
          margin-top: 8px;
        }
        .pay-period {
          font-size: 12px;
          margin-top: 2px;
        }
        .section {
          border: 1px solid #000;
          margin-bottom: 8px;
        }
        .section-inner {
          padding: 6px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .info-row {
          display: flex;
          font-size: 10px;
          line-height: 1.2;
        }
        .info-label {
          width: 120px;
          font-weight: 500;
          flex-shrink: 0;
        }
        .info-separator {
          width: 10px;
          flex-shrink: 0;
        }
        .info-value {
          font-weight: bold;
          flex: 1;
        }
        .table-section {
          border: 1px solid #000;
          margin-bottom: 8px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th {
          border-right: 1px solid #000;
          border-bottom: 1px solid #000;
          padding: 4px 6px;
          text-align: left;
          font-weight: bold;
          font-size: 10px;
          background: white;
        }
        td {
          border-right: 1px solid #000;
          border-bottom: 1px solid #000;
          padding: 3px 6px;
          font-size: 10px;
        }
        .total-row {
          font-weight: bold;
          text-transform: uppercase;
          border-top: 1px solid #000;
        }
        .net-pay-row {
          font-weight: bold;
          border-top: 1px solid #000;
        }
        .net-pay-label {
          width: 60px;
        }
        .ctc-section {
          border: 1px solid #000;
          border-top: none;
        }
        .ctc-header {
          border-bottom: 1px solid #000;
          padding: 4px 6px;
          font-weight: bold;
          text-transform: uppercase;
          font-size: 10px;
        }
        .ctc-table td {
          padding: 3px 6px;
        }
        .footer {
          margin-top: 6px;
          font-size: 7px;
          font-weight: bold;
        }
        .footer p {
          margin: 2px 0;
        }
        .signatory {
          margin-top: auto;
          border-top: 1px solid #000;
          padding-top: 6px;
          display: flex;
          justify-content: flex-end;
        }
        .signatory-box {
          text-align: center;
          width: 140px;
          border-top: 1px solid #000;
          padding-top: 4px;
        }
        .signatory-text {
          font-size: 8px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
      </style>
    </head>
    <body onload="window.print(); setTimeout(() => window.close(), 1000);">
      <div class="container">
        <!-- Header -->
        <div class="header">
          <h1 class="hospital-name">${h?.name || "Institutional Healthcare"}</h1>
          <p class="hospital-info">${h?.address || "Hospital Complex"}</p>
          <p class="hospital-info">Phone: ${h?.phone || "91-0000000000"} | Email: ${h?.email || "admin@hospital.com"}</p>
          <div class="pay-slip-title">Pay Slip For the Month of ${monthName}</div>
          <div class="pay-period">${fullPeriod}</div>
        </div>

        <!-- Employee Identity -->
        <div class="section">
          <div class="section-inner">
            <div class="info-grid">
              <div>
                <div class="info-row">
                  <span class="info-label">Employee Name</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.name || "N/A"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Father's Name</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.fatherName || rx.fatherName || "N/A"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">PAN</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.panNumber || rx.panNumber || "N/A"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">PF A/c No</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.pfNumber || rx.pfNumber || "N.A."}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Branch</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.workLocation || rx.workLocation || "HYDERABAD"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Designation</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.designation || "N/A"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Scale</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.scale || "N/A"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Pay Mode</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${rx.paymentMethod?.replace("_", " ").toUpperCase() || "TRANSFER"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Resignation Date</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.resignationDate || "N/A"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Address (Perm.)</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.permanentAddress || (u.address?.street ? u.address.street + ", " + u.address.city : "N/A")}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Work Location</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.workLocation || rx.workLocation || "N/A"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">E-Mail</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.email || "N/A"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Address (Corres.)</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.currentAddress || u.permanentAddress || "N/A"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Mobile</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.mobile || "N/A"}</span>
                </div>
              </div>
              <div>
                <div class="info-row">
                  <span class="info-label">Employee Code</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.employeeId || "N/A"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">DOJ</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.joiningDate || rx.joiningDate ? new Date(u.joiningDate || rx.joiningDate).toLocaleDateString("en-GB") : "N/A"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Bank A/c No.</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.bankDetails?.accountNumber || rx.bankAccount || "N/A"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">ESI A/c No</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.esiNumber || rx.esiNumber || "N.A."}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Department</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.department || rx.department || "N/A"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Category</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.category || "UNIVERSAL"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Bank Name</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.bankDetails?.bankName || "N/A"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Gender</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.gender || rx.gender || "N/A"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Confirmation Date</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.confirmationDate || "N/A"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Shift</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.shift || "DAY SHIFT"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">DOB</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.dob || rx.dob ? new Date(u.dob || rx.dob).toLocaleDateString("en-GB") : "N/A"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">UAN</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.uanNumber || rx.uanNumber || "N.A."}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Aadhar No.</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${u.aadharNumber || rx.aadharNumber || "N/A"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Attendance Registry -->
        <div class="section">
          <div class="section-inner">
            <div class="info-grid">
              <div>
                <div class="info-row">
                  <span class="info-label">Month Days</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${payroll?.monthDays || 30}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Weekly-Off</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${payroll?.weeklyOffDays || 0}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Paid Holidays</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${payroll?.paidHolidays || 0}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Working Days</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${(payroll?.monthDays || 30) - (payroll?.weeklyOffDays || 0)}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">LWP</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${payroll?.absentDays || 0}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Present Days</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${payroll?.presentDays || 0}</span>
                </div>
              </div>
              <div>
                <div class="info-row">
                  <span class="info-label">Total Paid Days</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${(payroll?.presentDays || 0) + (payroll?.leaveDays || 0)}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Days-Off</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${payroll?.daysOff || 0}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Unpaid Holidays</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${payroll?.unpaidHolidays || 0}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Max Payable Days</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${payroll?.monthDays || 30}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Net Paid Days</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${(payroll?.presentDays || 0) + (payroll?.leaveDays || 0)}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Paid Leaves</span>
                  <span class="info-separator">:</span>
                  <span class="info-value">${payroll?.leaveDays || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Financial Table -->
        <div class="table-section">
          <table>
            <thead>
              <tr>
                <th style="width: 36%;">Earnings</th>
                <th style="width: 14%; text-align: right;">Amount Rs.</th>
                <th style="width: 36%;">Deductions</th>
                <th style="width: 14%; text-align: right;">Amount Rs.</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>BASIC SALARY</td>
                <td style="text-align: right;">${(b.basic || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td>PF</td>
                <td style="text-align: right;">${(b.pf || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td>HRA</td>
                <td style="text-align: right;">${(b.hra || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td>ESI</td>
                <td style="text-align: right;">${(b.esi || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td>TRANSPORT ALLOWANCE</td>
                <td style="text-align: right;">${(b.transportAllowance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td>PROFESSIONAL TAX</td>
                <td style="text-align: right;">${(b.professionalTax || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td>Medical Allowance</td>
                <td style="text-align: right;">${(b.medicalAllowance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td>Salary Advance</td>
                <td style="text-align: right;">${(b.salaryAdvance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td>Special Allowance</td>
                <td style="text-align: right;">${(b.specialAllowance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td>TDS</td>
                <td style="text-align: right;">${(b.tds || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td>Salary Arrears</td>
                <td style="text-align: right;">${(b.salaryArrears || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td></td>
                <td style="text-align: right;"></td>
              </tr>
              <tr>
                <td>Bonus</td>
                <td style="text-align: right;">${(b.bonus || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td></td>
                <td style="text-align: right;"></td>
              </tr>
              <tr class="total-row">
                <td>Total Earnings</td>
                <td style="text-align: right;">${totalGross.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td>Total Deductions</td>
                <td style="text-align: right;">${totalDeducts.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr class="net-pay-row">
                <td colspan="4">
                  <div style="display: flex;">
                    <span class="net-pay-label">Net Pay</span>
                    <span>: Rs. ${netSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </td>
              </tr>
              <tr class="net-pay-row">
                <td colspan="4">
                  <div style="display: flex;">
                    <span class="net-pay-label">In Words</span>
                    <span>: Rs. ${numberToWords(netSalary)}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- CTC Section -->
        <div class="ctc-section">
          <div class="ctc-header">Employer's Contribution (CTC)</div>
          <table class="ctc-table">
            <tbody>
              <tr>
                <td style="width: 86%;">GROSS EARNING</td>
                <td style="width: 14%; text-align: right; font-weight: bold;">${totalGross.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td>EMPLOYER'S PROVIDENT FUND</td>
                <td style="text-align: right; font-weight: bold;">${c.providentFund ? c.providentFund.toLocaleString() : "Nil"}</td>
              </tr>
              <tr>
                <td style="padding-left: 24px; font-style: italic; opacity: 0.6;">- - &gt; PENSION FUND</td>
                <td style="text-align: right; font-size: 8.4px; font-weight: bold;">Nil</td>
              </tr>
              <tr>
                <td style="padding-left: 24px; font-style: italic; opacity: 0.6;">- - &gt; PROVIDENT FUND</td>
                <td style="text-align: right; font-size: 8.4px; font-weight: bold;">Nil</td>
              </tr>
              <tr>
                <td>EMPLOYER'S STATE INSURANCE</td>
                <td style="text-align: right; font-weight: bold;">${c.employerEsi ? c.employerEsi.toLocaleString() : "Nil"}</td>
              </tr>
              <tr style="border-top: 1px solid #000; border-bottom: 1px solid #000; font-weight: bold; text-transform: uppercase; text-align: right;">
                <td>Total :</td>
                <td>${totalGross.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr style="font-weight: bold;">
                <td colspan="2">
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px;">
                    <div>
                      <div style="display: flex;"><span style="width: 56px; text-transform: uppercase;">Total CTC</span><span>: Rs. ${totalGross.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                      <div style="display: flex;"><span style="width: 56px; text-transform: uppercase;">In Words</span><span style="font-weight: bold; text-decoration: underline;">: Rs. ${numberToWords(totalGross)}</span></div>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer -->
        <div class="footer" style="font-size: 8.4px;">
          <p>TDS Deducted Upto ${monthName} : Rs. Nil</p>
          <p>This is Computer Generated Sheet, does not require Signature.</p>
        </div>

        <!-- Signatory -->
        <div class="signatory">
          <div class="signatory-box">
            <div class="signatory-text">Authorised Signatory</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const generateClinicalReceiptHtml = (data: any) => {
  const { hospital, patient, appointment, payment, headerHtml, footerHtml } =
    data;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Patient Registration Bill - ${patient.name}</title>
      <meta charset="UTF-8">
      <style>
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
          }
        }
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: #333;
          line-height: 1.45;
          margin: 0;
          padding: 12px;
          background: white;
          font-size: 12px;
        }
        .receipt-container {
          width: 95%;
          margin: 0 auto;
        }
        ${
          headerHtml
            ? ""
            : `
        .hospital-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          margin-bottom: 60px;
          border-bottom: 1.5px solid #000;
          padding-bottom: 24px;
        }
        .hospital-details {
          text-align: left;
        }
        .hospital-name {
          font-size: 25px;
          font-weight: bold;
          margin: 0;
          text-transform: uppercase;
        }
        .hospital-info {
          font-size: 12px;
          margin: 4px 0;
        }
        `
        }
        .bill-title-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }
        .bill-title {
          font-size: 17px;
          font-weight: bold;
          text-transform: uppercase;
        }
        .bill-subtitle {
           font-size: 11px;
           color: #666;
        }
        .bill-meta {
          text-align: right;
          font-size: 12px;
        }
        .section {
          margin-bottom: 12px;
        }
        .section-header {
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
          margin-bottom: 5px;
          border-bottom: 1px solid #eee;
          padding-bottom: 3px;
        }
        .data-grid {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 8px;
        }
        .data-grid td {
          padding: 5px 8px;
          border: 1px solid #ddd;
          font-size: 11px;
        }
        .label {
          font-weight: bold;
          background-color: #fcfcfc;
          width: 20%;
        }
        .value {
          width: 30%;
        }
        .vitals-grid {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        .vitals-grid th, .vitals-grid td {
          border: 1px solid #ddd;
          padding: 5px 8px;
          text-align: left;
          font-size: 11px;
        }
        .vitals-grid th {
          background-color: #fcfcfc;
        }
        .symptoms-box {
          border-left: 4px solid #f59e0b;
          background-color: #fffbeb;
          padding: 10px;
          font-size: 12px;
          font-weight: 500;
          margin-top: 5px;
        }
        .payment-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 5px;
        }
        .payment-table th, .payment-table td {
          padding: 7px;
          border: 1px solid #ddd;
          text-align: left;
          font-size: 12px;
        }
        .payment-table th {
          background-color: #fcfcfc;
          font-weight: bold;
        }
        .total-row td {
          font-weight: bold;
          font-size: 16px;
        }
        .payment-footer {
          margin-top: 8px;
          font-size: 10px;
          font-weight: bold;
        }
        .status-paid {
          color: #10b981;
        }
        .footer {
          page-break-before: always;
          margin-top: 30mm;
          padding-top: 60px;
          border-top: 1px solid #eee;
          font-size: 10px;
          color: #777;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          padding-bottom: 15mm;
        }
        .signatory-box {
          text-align: right;
        }
        .sign-line {
          width: 180px;
          border-bottom: 1px solid #000;
          margin-bottom: 5px;
          margin-left: auto;
        }
        .footer-wrapper {
          page-break-before: always;
          margin-top: 60px;
        }
        .no-print {
          display: block;
          margin: 20px auto;
          text-align: center;
        }
        .return-btn {
          padding: 10px 24px;
          background-color: #0f172a;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: bold;
          cursor: pointer;
          text-decoration: none;
          font-family: inherit;
        }
        @media print {
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body onload="window.print();">
      <script>
        window.onafterprint = function() {
          setTimeout(() => {
            window.location.replace('${data.returnUrl || "/helpdesk"}');
          }, 500);
        };
      </script>
      <div class="no-print" style="position: sticky; top: 0; background: white; padding: 10px; z-index: 1000; border-bottom: 2px solid #0f172a;">
         <button onclick="window.location.replace('${data.returnUrl || "/helpdesk"}')" class="return-btn" style="width: 100%; max-width: 400px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em;">
            ← BACK TO HOSPITAL DASHBOARD
         </button>
      </div>
      <div class="receipt-container">
        <!-- Hospital Header -->
        ${
          headerHtml ||
          `
        <div class="hospital-header">
          ${hospital.logo ? `<img src="${hospital.logo}" alt="Logo" style="max-height: 85px; width: auto; object-fit: contain;" />` : ""}
          <div class="hospital-details">
            <h1 class="hospital-name">${hospital.name}</h1>
            <p class="hospital-info">${hospital.address || ""}</p>
            <p class="hospital-info">${hospital.contact ? `Phone: ${hospital.contact}` : ""} ${hospital.email ? ` | Email: ${hospital.email}` : ""}</p>
          </div>
        </div>
        `
        }

        <!-- Bill Title Row -->
        <div class="bill-title-row">
          <div>
            <div class="bill-title">${data.registrationType === "IPD" ? "IPD Admission Receipt" : "Patient Registration Bill"}</div>
            <div class="bill-subtitle">${data.registrationType === "IPD" ? "Hospital Admission Document" : "Appointment Receipt"}</div>
          </div>
          <div class="bill-meta">
            <div><strong>Date:</strong> ${appointment.date}</div>
            <div><strong>Bill No:</strong> ${appointment.appointmentId}</div>
          </div>
        </div>

        <!-- Patient Details -->
        <div class="section">
          <div class="section-header">Patient Details</div>
          <table class="data-grid">
            <tr>
              <td class="label">MRN:</td>
              <td class="value">${patient.mrn}</td>
              <td class="label">Blood Group:</td>
              <td class="value">${patient.bloodGroup || "-"}</td>
            </tr>
            <tr>
              <td class="label">Name:</td>
              <td class="value">${patient.name}</td>
              <td class="label">DOB:</td>
              <td class="value">${patient.dob ? patient.dob.split("T")[0] : "-"}</td>
            </tr>
            <tr>
              <td class="label">Age/Gender:</td>
              <td class="value">${patient.age} Yrs / ${patient.gender}</td>
              <td class="label">Mobile:</td>
              <td class="value">${patient.mobile}</td>
            </tr>
            <tr>
              <td class="label">Email:</td>
              <td class="value">${patient.email || "-"}</td>
              <td class="label">Alt. Contact:</td>
              <td class="value">${patient.emergencyContact || "-"}</td>
            </tr>
            <tr>
              <td class="label">Address:</td>
              <td colspan="3" class="value">${patient.address || "-"}</td>
            </tr>
          </table>
        </div>

        <!-- Appointment Details -->
        <div class="section">
          <div class="section-header">Appointment Details</div>
          <table class="data-grid">
            <tr>
              <td class="label">Consulting Doctor:</td>
              <td class="value">${appointment.doctorName?.toLowerCase().startsWith("dr") ? appointment.doctorName : `Dr. ${appointment.doctorName || "Assigned Physician"}`}</td>
              <td class="label">Appointment Date:</td>
              <td class="value">${appointment.date}</td>
            </tr>
            <tr>
              <td class="label">Qualification:</td>
              <td class="value">${appointment.qualification || "MBBS, DM"}</td>
              <td class="label">Appointment Time:</td>
              <td class="value">${appointment.time || "IN QUEUE"}</td>
            </tr>
            <tr>
              <td class="label">Specialization:</td>
              <td class="value">${appointment.specialization || "General Doctor"}</td>
              <td class="label">Visit Type:</td>
              <td class="value">${appointment.type || "Consultation"}</td>
            </tr>
          </table>
        </div>

        <!-- Vital Signs -->
        <div class="section">
          <div class="section-header">Vital Signs (Current Visit)</div>
          <table class="vitals-grid">
            <tr>
              <th>Height</th>
              <th>Weight</th>
              <th>Temp</th>
              <th>BP</th>
              <th>Pulse</th>
              <th>SpO2</th>
              <th>Glucose</th>
            </tr>
            <tr>
              <td>${patient.vitals?.height ? patient.vitals.height + " cm" : "-"}</td>
              <td>${patient.vitals?.weight ? patient.vitals.weight + " kg" : "-"}</td>
              <td>${patient.vitals?.temperature ? patient.vitals.temperature + " °F" : "-"}</td>
              <td>${patient.vitals?.bloodPressure || patient.vitals?.bp || "-"}</td>
              <td>${patient.vitals?.pulse ? patient.vitals.pulse + " bpm" : "-"}</td>
              <td>${patient.vitals?.spO2 || patient.vitals?.spo2 ? (patient.vitals?.spO2 || patient.vitals?.spo2) + "%" : "-"}</td>
              <td>${patient.vitals?.glucose || patient.vitals?.sugar ? (patient.vitals?.glucose || patient.vitals?.sugar) + " mg/dL" : "-"}</td>
            </tr>
          </table>
        </div>

        <!-- Allergies & History -->
        ${
          (patient.allergies &&
            patient.allergies.length > 0 &&
            patient.allergies !== "None" &&
            patient.allergies !== "NONE") ||
          (patient.medicalHistory &&
            patient.medicalHistory !== "None" &&
            patient.medicalHistory !== "NONE" &&
            patient.medicalHistory !== "CLEAR")
            ? `
        <div class="section">
          <div class="section-header">Medical History & Allergies</div>
          <table class="data-grid">
            ${
              patient.allergies &&
              patient.allergies.length > 0 &&
              patient.allergies !== "None" &&
              patient.allergies !== "NONE"
                ? `
            <tr>
              <td class="label" style="color: #e11d48;">Allergies:</td>
              <td colspan="3" class="value" style="color: #e11d48;">${Array.isArray(patient.allergies) ? patient.allergies.join(", ") : patient.allergies}</td>
            </tr>`
                : ""
            }
            ${
              patient.medicalHistory &&
              patient.medicalHistory !== "None" &&
              patient.medicalHistory !== "NONE" &&
              patient.medicalHistory !== "CLEAR"
                ? `
            <tr>
              <td class="label">Hist/Issues:</td>
              <td colspan="3" class="value">${patient.medicalHistory}</td>
            </tr>`
                : ""
            }
          </table>
        </div>`
            : ""
        }

        <!-- Symptoms -->
        ${
          appointment.notes
            ? `
        <div class="section">
          <div class="section-header">Current Symptoms</div>
          <div class="symptoms-box">
            ${appointment.notes}
          </div>
        </div>`
            : ""
        }

        <!-- Payment Summary -->
        <div class="section">
          <div class="section-header">Payment Summary</div>
          <table class="payment-table">
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align: right;">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${
                data.registrationType === "IPD" &&
                appointment.type?.includes("Settlement")
                  ? `
                <tr>
                  <td style="font-weight: bold; color: #475569;">Advance Amount</td>
                  <td style="text-align: right; font-weight: bold;">₹ ${Math.round(payment.advanceAmount || 0).toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="font-weight: bold; color: #e11d48;">Due Amount</td>
                  <td style="text-align: right; font-weight: bold;">₹ ${Math.round(payment.amount).toLocaleString()}</td>
                </tr>
                <tr class="total-row">
                  <td>TOTAL BILL AMOUNT</td>
                  <td style="text-align: right;">₹ ${Math.round(payment.totalBillAmount || payment.amount + (payment.advanceAmount || 0)).toLocaleString()}</td>
                </tr>
              `
                  : `
                <tr>
                  <td>${data.registrationType === "IPD" ? "IPD Admission Fee" : "Consultation Fee (OPD)"}</td>
                  <td style="text-align: right;">₹ ${Math.round(payment.amount).toLocaleString()}</td>
                </tr>
                <tr class="total-row">
                  <td>TOTAL AMOUNT</td>
                  <td style="text-align: right;">₹ ${Math.round(payment.amount).toLocaleString()}</td>
                </tr>
              `
              }
            </tbody>
          </table>
          <div class="payment-footer">
            <div>Payment Method: ${payment.method || "N/A"}</div>
            <div class="${payment?.status?.toUpperCase() === "PAID" ? "status-paid" : ""}">Payment Status: ${payment?.status || "Unknown"}</div>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer-wrapper">
          ${
            footerHtml ||
            `
          <div class="footer">
            <div>
              <p>This is a computer-generated receipt and does not require a signature.</p>
              <p>Generated on: ${new Date().toLocaleString()}</p>
            </div>
            <div class="signatory-box">
              <div class="sign-line"></div>
              <div style="font-weight: bold; text-transform: uppercase;">Authorized Signatory</div>
              <div style="font-size: 10px;">${hospital.name}</div>
            </div>
          </div>
          `
          }
        </div>
      </div>
    </body>
    </html>
  `;
};

// --- NEW HELPERS FOR REPRINTING (MATCHING DOCTOR TEMPLATES) ---

export const generatePrescriptionHtml = (data: any) => {
  const { hospital, patient, doctor, prescription, headerHtml, footerHtml } =
    data;
  const medicines = prescription.medicines || [];
  const dietAdvice = prescription.dietAdvice || [];

  // Helper to avoid double Dr. prefix
  const formatDoctorName = (name: string) => {
    if (!name) return "Unknown Doctor";
    return name.toLowerCase().startsWith("dr") ? name : `Dr. ${name}`;
  };

  const getHonorific = (gender: string, age?: number) => {
    if (!gender) return "";
    const g = gender.toLowerCase();
    if (g === "male") return age && age < 13 ? "Master." : "Mr.";
    if (g === "female") return age && age < 13 ? "Miss." : "Ms.";
    return "";
  };

  const patientName =
    `${getHonorific(patient.gender, patient.age)} ${patient.name}`.trim();
  const ageDisplay =
    patient.age && patient.age !== "-" ? `${patient.age} Y` : "N/A";
  const genderDisplay =
    patient.gender && patient.gender !== "-"
      ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)
      : "N/A";

  return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Prescription - ${patientName}</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                    
                    @media print {
                        @page { size: A4; margin: 0; }
                        body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
                    }

                    body { 
                        font-family: 'Inter', sans-serif; 
                        margin: 0;
                        padding: 0;
                        background: white;
                        font-size: 11px;
                        line-height: 1.4;
                        color: #111;
                    }

                    .container {
                        width: 210mm;
                        min-height: 297mm;
                        margin: 0 auto;
                        padding: 15mm 20mm;
                        position: relative;
                        box-sizing: border-box;
                        border: 1px solid #e5e7eb;
                    }

                    /* Header */
                    .header {
                        display: flex;
                        align-items: center;
                        gap: 20px;
                        padding-bottom: 20px;
                        margin-bottom: 20px;
                        border-bottom: 2px solid #000;
                    }
                    .brand { flex: 1; display: flex; align-items: center; gap: 15px; }
                    .brand-text { text-align: left; }
                    .brand h1 { margin: 0; font-size: 20px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
                    .brand p { margin: 2px 0 0; font-size: 9px; color: #555; }
                    
                    .doctor { text-align: right; }
                    .doctor h2 { margin: 0; font-size: 14px; font-weight: 700; }
                    .doctor p { margin: 2px 0 0; font-size: 9px; font-weight: 600; text-transform: uppercase; color: #555; }

                    /* Patient Grid - Clean, No Box */
                    .patient-info {
                        display: grid;
                        grid-template-columns: repeat(4, 1fr);
                        gap: 15px;
                        margin-bottom: 25px;
                        padding-bottom: 15px;
                        border-bottom: 1px solid #eee;
                    }
                    .info-label { display: block; font-size: 8px; font-weight: 700; text-transform: uppercase; color: #777; margin-bottom: 3px; letter-spacing: 0.5px; }
                    .info-val { font-size: 12px; font-weight: 600; text-transform: uppercase; }

                    /* Diagnosis */
                    .diagnosis-box { margin-bottom: 20px; }
                    .diagnosis-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #777; letter-spacing: 0.5px; }
                    .diagnosis-val { font-size: 12px; font-weight: 600; margin-left: 6px; }

                    /* Med List/Table */
                    .section-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #000; border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 10px; letter-spacing: 0.5px; }
                    
                    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                    th { text-align: left; font-size: 9px; font-weight: 700; text-transform: uppercase; color: #777; padding: 0 0 8px 0; border-bottom: 1px solid #eee; }
                    td { padding: 10px 0; border-bottom: 1px solid #f9f9f9; vertical-align: top; }
                    
                    .med-name { font-size: 12px; font-weight: 700; margin-bottom: 2px; }
                    .med-meta { font-size: 10px; color: #555; }
                    
                    /* Advice Grid */
                    .advice-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
                    .advice-list { list-style: none; padding: 0; margin: 0; }
                    .advice-list li { margin-bottom: 6px; padding-left: 15px; position: relative; font-size: 11px; }
                    .advice-list li:before { content: "•"; position: absolute; left: 0; color: #aaa; }

                    /* Follow up */
                    .follow-up { margin-top: 30px; padding-top: 15px; border-top: 1px dashed #eee; font-size: 11px; }
                    .follow-up strong { font-weight: 700; text-transform: uppercase; font-size: 9px; color: #777; margin-right: 5px; }

                    /* Footer */
                    .footer { position: absolute; bottom: 15mm; left: 20mm; right: 20mm; display: flex; justify-content: space-between; align-items: flex-end; }
                    .footer-l span { display: block; font-size: 8px; color: #999; line-height: 1.5; }
                    
                    .sig-block { text-align: center; }
                    .sig-img { height: 40px; display: block; margin: 0 auto 5px; }
                    .sig-line { border-top: 1px solid #ccc; padding-top: 5px; font-size: 9px; font-weight: 600; text-transform: uppercase; min-width: 120px; }

                    .no-print {
                        position: sticky;
                        top: 0;
                        background: white;
                        padding: 10px;
                        z-index: 1000;
                        border-bottom: 2px solid #000;
                        text-align: center;
                    }
                    .return-btn {
                        padding: 10px 24px;
                        background-color: #000;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-weight: bold;
                        cursor: pointer;
                        text-decoration: none;
                        font-family: inherit;
                        width: 100%;
                        max-width: 400px;
                        font-size: 14px;
                        text-transform: uppercase;
                        letter-spacing: 0.1em;
                    }
                    @media print {
                        .no-print { display: none !important; }
                    }
                </style>
            </head>
            <body onload="window.print();">
                <script>
                    window.onafterprint = function() {
                        setTimeout(() => {
                            window.location.replace('${data.returnUrl || "/helpdesk"}');
                        }, 500);
                    };
                </script>
                <div class="no-print">
                    <button onclick="window.location.replace('${data.returnUrl || "/helpdesk"}')" class="return-btn">
                        ← BACK TO HOSPITAL DASHBOARD
                    </button>
                </div>
                <div class="container">
                    ${
                      headerHtml ||
                      `
                    <div class="header">
                        <div class="brand">
                            ${hospital.logo ? `<img src="${hospital.logo}" style="max-height: 70px; width: auto; object-fit: contain;" />` : ""}
                            <div class="brand-text">
                                <h1>${hospital.name || "CureChain Medical Center"}</h1>
                                <p>${hospital.address || ""}</p>
                                <p>${hospital.contact || hospital.phone || ""} ${hospital.email ? `• ${hospital.email}` : ""}</p>
                            </div>
                        </div>
                    </div>
                    `
                    }

                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 1px solid #000; padding-bottom: 10px;">
                        <div style="font-size: 16px; font-weight: 700; text-transform: uppercase; color: #1e40af;">PRESCRIPTION</div>
                        <div style="text-align: right;">
                            <h2 style="margin: 0; font-size: 14px; font-weight: 700;">${formatDoctorName(doctor.name)}</h2>
                            <p style="margin: 2px 0 0; font-size: 9px; font-weight: 600; text-transform: uppercase; color: #555;">${doctor.specialization || "Consultant Physician"}</p>
                        </div>
                    </div>

                    <div class="patient-info">
                        <div>
                            <span class="info-label">Name</span>
                            <span class="info-val">${patientName}</span>
                        </div>
                        <div>
                            <span class="info-label">Age / Gender</span>
                            <span class="info-val">${ageDisplay} / ${genderDisplay}</span>
                        </div>
                        <div>
                            <span class="info-label">ID</span>
                            <span class="info-val">${patient.mrn || "-"}</span>
                        </div>
                        <div>
                            <span class="info-label">Date</span>
                            <span class="info-val">${new Date(prescription.createdAt).toLocaleDateString("en-GB")}</span>
                        </div>
                    </div>

                    ${
                      prescription.diagnosis
                        ? `
                    <div class="diagnosis-box">
                        <span class="diagnosis-label">Diagnosis:</span>
                        <span class="diagnosis-val">${prescription.diagnosis}</span>
                    </div>
                    `
                        : ""
                    }

                    <div class="section-label">Medications</div>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 40%">Medicine</th>
                                <th style="width: 20%">Dosage</th>
                                <th style="width: 20%">Frequency</th>
                                <th style="width: 10%">Days</th>
                                <th style="width: 10%">Qty</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${medicines
                              .map(
                                (med: any) => `
                            <tr>
                                <td>
                                    <div class="med-name">${med.name}</div>
                                </td>
                                <td class="med-meta">${med.dosage || "-"}</td>
                                <td class="med-meta">${med.freq || med.frequency || "-"}</td>
                                <td class="med-meta">${med.duration || "-"}</td>
                                <td class="med-meta">${med.quantity || "-"}</td>
                            </tr>
                            `,
                              )
                              .join("")}
                        </tbody>
                    </table>

                    <div class="advice-grid">
                        ${
                          dietAdvice.length > 0
                            ? `
                        <div>
                            <div class="section-label" style="border-bottom: 1px solid #eee; margin-top: 10px;">Advice</div>
                            <ul class="advice-list">
                                ${dietAdvice
                                  .filter((i: string) => i.trim())
                                  .map((d: string) => `<li>${d}</li>`)
                                  .join("")}
                            </ul>
                        </div>
                        `
                            : ""
                        }
                    </div>

                    ${
                      prescription.advice
                        ? `
                    <div class="follow-up">
                        <strong>Advice / Follow Up:</strong> ${prescription.advice}
                    </div>
                    `
                        : ""
                    }

                    ${
                      footerHtml ||
                      `
                    <div class="footer">
                        <div class="footer-l">
                            <span>Generated by MsCurechain Systems</span>
                            <span>Valid for 30 days</span>
                        </div>
                        <div class="sig-block">
                            ${doctor.signature ? `<img src="${doctor.signature}" class="sig-img" />` : '<div style="height: 40px;"></div>'}
                            <div class="sig-line">Authorized Signature</div>
                        </div>
                    </div>
                    `
                    }
                </div>
            </body>
            </html>
    `;
};

export const generateLabTokenHtml = (data: any) => {
  const { hospital, patient, doctor, labToken, headerHtml, footerHtml } = data;
  const tests = labToken.tests || [];
  const priority = labToken.priority || "routine";
  const notes = labToken.notes;

  const formatDoctorName = (name: string) => {
    if (!name) return "Unknown Doctor";
    return name.toLowerCase().startsWith("dr") ? name : `Dr. ${name}`;
  };

  const getHonorific = (gender: string, age?: number) => {
    if (!gender) return "";
    const g = gender.toLowerCase();
    if (g === "male") return age && age < 13 ? "Master." : "Mr.";
    if (g === "female") return age && age < 13 ? "Miss." : "Ms.";
    return "";
  };

  const patientName =
    `${getHonorific(patient.gender, patient.age)} ${patient.name}`.trim();
  const ageDisplay =
    patient.age && patient.age !== "-" ? `${patient.age} Y` : "N/A";
  const genderDisplay =
    patient.gender && patient.gender !== "-"
      ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)
      : "N/A";

  return `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Lab Token</title>
            <meta charset="UTF-8">
            <style>
              @media print {
                @page { size: A4; margin: 0; }
                body { margin: 0; padding: 12mm 15mm 12mm 25mm; }
              }
              body { font-family: Arial, sans-serif; background: white; }
              .header { text-align: center; border-bottom: 4px solid #9333ea; padding-bottom: 10px; margin-bottom: 20px; }
              .token-badge { background: #1f2937; color: white; padding: 8px 16px; border-radius: 8px; display: inline-block; }
              table { width: 100%; border-collapse: collapse; margin: 16px 0; }
              th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; }
              th { background: #f9fafb; font-weight: bold; }
              .priority { padding: 4px 12px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase; }
              .priority-stat { background: #dc2626; color: white; }
              .priority-urgent { background: #f97316; color: white; }
              .priority-routine { background: #2563eb; color: white; }
              .no-print {
                position: sticky;
                top: 0;
                background: white;
                padding: 10px;
                z-index: 1000;
                border-bottom: 2px solid #9333ea;
                text-align: center;
              }
              .return-btn {
                padding: 10px 24px;
                background-color: #9333ea;
                color: white;
                border: none;
                border-radius: 8px;
                font-weight: bold;
                cursor: pointer;
                text-decoration: none;
                font-family: inherit;
                width: 100%;
                max-width: 400px;
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 0.1em;
              }
              .container {
                width: 210mm;
                min-height: 297mm;
                margin: 0 auto;
                padding: 15mm 20mm;
                box-sizing: border-box;
                border: 1px solid #e5e7eb;
                position: relative;
              }
              @media print {
                .no-print { display: none !important; }
              }
            </style>
          </head>
          <body onload="window.print();">
            <script>
                window.onafterprint = function() {
                    setTimeout(() => {
                        window.location.replace('${data.returnUrl || "/helpdesk"}');
                    }, 500);
                };
            </script>
            <div class="no-print">
                <button onclick="window.location.replace('${data.returnUrl || "/helpdesk"}')" class="return-btn">
                    ← BACK TO HOSPITAL DASHBOARD
                </button>
            </div>
            <div class="container">
              ${
                headerHtml ||
                `
              <div class="header">
                  <h1 style="color: #9333ea; margin: 0; font-size: 24px;">LAB REQUISITION</h1>
                  <h2 style="margin: 8px 0; font-size: 18px;">${hospital.name || "CureChain Medical Center"}</h2>
                  <p style="margin: 4px 0; font-size: 12px; color: #6b7280;">Department of Pathology & Radiodiagnosis</p>
              </div>
              `
              }

              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 10px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;">
                  <div>
                      <h1 style="color: #1e40af; margin: 0; font-size: 18px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">LAB REQUISITION</h1>
                      <p style="margin: 4px 0; font-size: 11px;"><strong>Date:</strong> ${new Date(labToken.createdAt).toLocaleDateString("en-GB")}</p>
                      <span class="priority priority-${priority}">${priority}</span>
                  </div>
                  <div class="token-badge" style="text-align: center; min-width: 100px;">
                      <p style="margin: 0; font-size: 10px; opacity: 0.7; color: white;">TOKEN</p>
                      <p style="margin: 0; font-size: 24px; font-weight: bold; color: white;">${labToken.tokenNumber}</p>
                  </div>
              </div>
              
              <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                <p style="margin: 4px 0;"><strong>Patient:</strong> ${patientName}</p>
                <p style="margin: 4px 0;"><strong>Age/Gender:</strong> ${ageDisplay} / ${genderDisplay}</p>
                <p style="margin: 4px 0;"><strong>MRN:</strong> ${patient.mrn || "N/A"}</p>
                <p style="margin: 4px 0;"><strong>Ordering Physician:</strong> ${formatDoctorName(doctor.name)}</p>
              </div>

              <h3 style="color: #9333ea; font-size: 14px; margin-bottom: 12px;">CLINICAL INVESTIGATIONS</h3>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Test Name</th>
                    <th>Category</th>
                    <th>Instructions</th>
                    <th style="text-align: right;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${tests
                    .filter((t: any) => t.name.trim())
                    .map(
                      (test: any, idx: number) => `
                    <tr>
                      <td>${idx + 1}</td>
                      <td style="font-weight: bold;">${test.name}</td>
                      <td>${test.category}</td>
                      <td style="font-style: italic; color: #6b7280;">${test.instructions || "Standard"}</td>
                      <td style="text-align: right; font-weight: 600;">₹${(parseFloat(String(test.price || test.testPrice || test.amount || test.test?.price || test.testId?.price || 0)) || 0).toFixed(2)}</td>
                    </tr>
                  `,
                    )
                    .join("")}
                </tbody>
              </table>

              ${
                notes
                  ? `<div style="background: #fef3c7; padding: 12px; border-left: 4px solid #f59e0b; margin: 16px 0;">
                <p style="margin: 0; font-weight: bold; font-size: 12px;">Physician Remarks:</p>
                <p style="margin: 4px 0 0 0; font-style: italic;">${notes}</p>
              </div>`
                  : ""
              }

              <div style="text-align: right; margin-top: 50px;">
                <div style="width: 200px; border-bottom: 1.5px solid #000; margin-left: auto; margin-bottom: 6px;"></div>
                <p style="margin: 0; font-size: 10px; font-weight: bold; text-transform: uppercase; color: #475569;">Medical Officer Signature</p>
              </div>

              ${
                footerHtml ||
                `
              <div style="border-top: 1px solid #e5e7eb; margin-top: 40px; padding-top: 8px; text-align: center; font-size: 8px; color: #9ca3af;">
                <p style="margin: 0;">Generated by MsCureChain • ${new Date().toLocaleString()}</p>
              </div>
              `
              }
            </div>
          </body>
          </html>
    `;
};

export const generateQualityReportHtml = (data: any) => {
  const { metrics, trends, month, year, hospital, targets } = data;
  const T = targets || {
    opdWaitingTime: 30,
    bedOccupancyMin: 80,
    bedOccupancyMax: 90,
    alos: 5,
    billingTat: 180,
    incidentRateMax: 1.0,
    incidentCountMax: 5,
    readmissionRate: 5,
  };
  const monthName = new Intl.DateTimeFormat("en-US", { month: "long" }).format(
    new Date(year, month - 1),
  );
  const indicators = metrics?.indicators || {};
  const gaps = metrics?.dataGaps || {};
  const useRawIncidents = (metrics?.rawCounts?.totalOccupiedBedDays ?? 0) < 30;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>NABH Quality Report - ${monthName} ${year}</title>
      <meta charset="UTF-8">
      <style>
        @media print {
          @page { size: A4; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.3; font-size: 11px; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
        .title { font-size: 20px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin: 0; }
        .subtitle { font-size: 12px; color: #64748b; margin-top: 2px; font-weight: 600; text-transform: uppercase; }
        
        .meta-grid { display: flex; justify-content: space-between; margin-bottom: 20px; background: #fff; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
        .meta-item label { display: block; font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 2px; }
        .meta-item value { display: block; font-size: 11px; font-weight: 700; color: #0f172a; }
        

        /* Removed dark background, kept clean layout */
        .score-box { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; }
        .score-val { font-size: 24px; font-weight: 900; color: #0f172a; }
        .score-label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; }

        .section-title { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; color: #0f172a; border-left: 3px solid #0f172a; padding-left: 8px; }
        
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10px; }
        th { text-align: left; padding: 8px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; text-transform: uppercase; font-size: 9px; font-weight: 700; color: #475569; }
        td { padding: 8px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
        tr:last-child td { border-bottom: none; }
        
        /* Text-only status colors */
        .status-text { font-weight: 800; text-transform: uppercase; font-size: 9px; }
        .success { color: #16a34a; }
        .danger { color: #ef4444; }
        .warning { color: #f59e0b; }
        
        .footer { margin-top: 30px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; color: #94a3b8; font-size: 9px; }
        .signatures { display: flex; justify-content: space-between; margin-top: 40px; }
        .sign-line { width: 150px; border-top: 1px solid #0f172a; padding-top: 5px; text-align: center; font-weight: 700; font-size: 10px; text-transform: uppercase; }
      </style>
    </head>
    <script>
      window.onafterprint = () => {
        setTimeout(() => {
          window.close();
        }, 500);
      };
    </script>
    <body onload="window.print();">
      <div class="header">
        <h1 class="title">${hospital?.name || "CureChain Hospital"}</h1>
        <div class="subtitle">NABH Quality Indicator Audit Report</div>
      </div>

      <div class="meta-grid">
        <div class="meta-item">
          <label>Hospital Unit</label>
          <value>${hospital?.name || "CureChain Hospital"}</value>
        </div>
        <div class="meta-item">
          <label>Report Period</label>
          <value>${monthName} ${year}</value>
        </div>
        <div class="meta-item">
          <label>Governance Status</label>
          <value>${metrics?.status === "locked" ? "FINALIZED & VERIFIED" : "OPEN FOR REVIEW"}</value>
        </div>
        <div class="meta-item">
          <label>Verified By</label>
          <value>${metrics?.lockedBy?.name || "Pending"}</value>
        </div>
      </div>

      <div class="score-box">
        <div>
          <div class="score-label">Overall Compliance Score</div>
          <div class="score-val">${metrics?.complianceScore || 0}%</div>
        </div>
        <div style="text-align: right;">
          <div class="score-label">Total Data Gaps</div>
          <div class="score-val" style="color: ${(gaps.missingDiagnoses || 0) + (gaps.untrackedInfections || 0) + (gaps.emptyArrivalTimes || 0) > 0 ? "#ef4444" : "#16a34a"};">
            ${(gaps.missingDiagnoses || 0) + (gaps.untrackedInfections || 0) + (gaps.emptyArrivalTimes || 0)}
          </div>
        </div>
      </div>

      <div class="section-title">Key Performance Indicators</div>
      <table>
        <thead>
          <tr>
            <th style="width: 40%">Indicator</th>
            <th style="width: 20%">Target</th>
            <th style="width: 20%">Actual Value</th>
            <th style="width: 20%">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>OPD Waiting Time</strong><br><span style="color:#64748b; font-size:8px">Registration to Consultation</span></td>
            <td>&lt; ${T.opdWaitingTime} min</td>
            <td style="font-weight:700">${indicators.opdWaitingTime || 0} min</td>
            <td><span class="status-text ${indicators.opdWaitingTime < T.opdWaitingTime ? "success" : "danger"}">${indicators.opdWaitingTime < T.opdWaitingTime ? "COMPLIANT" : "NON-COMPLIANT"}</span></td>
          </tr>
          <tr>
            <td><strong>Bed Occupancy Rate</strong><br><span style="color:#64748b; font-size:8px">Utilized vs Available Beds</span></td>
            <td>${T.bedOccupancyMin}-${T.bedOccupancyMax}%</td>
            <td style="font-weight:700">${indicators.bedOccupancyRate || 0}%</td>
            <td><span class="status-text ${indicators.bedOccupancyRate >= T.bedOccupancyMin && indicators.bedOccupancyRate <= T.bedOccupancyMax ? "success" : "danger"}">${indicators.bedOccupancyRate >= T.bedOccupancyMin && indicators.bedOccupancyRate <= T.bedOccupancyMax ? "OPTIMAL" : indicators.bedOccupancyRate < T.bedOccupancyMin ? "LOW" : "HIGH"}</span></td>
          </tr>
          <tr>
            <td><strong>Avg Length of Stay (ALOS)</strong><br><span style="color:#64748b; font-size:8px">Admission to Discharge</span></td>
            <td>&lt; ${T.alos} days</td>
            <td style="font-weight:700">${indicators.alos || 0} days</td>
            <td><span class="status-text ${indicators.alos < T.alos ? "success" : "danger"}">${indicators.alos < T.alos ? "COMPLIANT" : "NON-COMPLIANT"}</span></td>
          </tr>
          <tr>
            <td><strong>Billing TAT</strong><br><span style="color:#64748b; font-size:8px">Discharge Advice to Settlement</span></td>
            <td>&lt; ${T.billingTat} min</td>
            <td style="font-weight:700">${indicators.billingTat || 0} min</td>
            <td><span class="status-text ${indicators.billingTat < T.billingTat ? "success" : "danger"}">${indicators.billingTat < T.billingTat ? "COMPLIANT" : "NON-COMPLIANT"}</span></td>
          </tr>
          <tr>
            <td><strong>Infection Rate</strong><br><span style="color:#64748b; font-size:8px">${useRawIncidents ? "Total reported incidents" : "HCAI per 1000 Patient Days"}</span></td>
            <td>&lt; ${useRawIncidents ? `${T.incidentCountMax} /mo` : `${T.incidentRateMax}‰`}</td>
            <td style="font-weight:700">${useRawIncidents ? metrics?.rawCounts?.totalIncidents || 0 : indicators.incidentRate || 0}${useRawIncidents ? "" : "‰"}</td>
            <td><span class="status-text ${useRawIncidents ? metrics?.rawCounts?.totalIncidents < T.incidentCountMax : indicators.incidentRate < T.incidentRateMax ? "success" : "danger"}">${useRawIncidents ? metrics?.rawCounts?.totalIncidents < T.incidentCountMax : indicators.incidentRate < T.incidentRateMax ? "COMPLIANT" : "NON-COMPLIANT"}</span></td>
          </tr>
          <tr>
            <td><strong>Readmission Rate</strong><br><span style="color:#64748b; font-size:8px">Same Diagnosis within 30 days</span></td>
            <td>&lt; ${T.readmissionRate}%</td>
            <td style="font-weight:700">${indicators.readmissionRate || 0}%</td>
            <td><span class="status-text ${indicators.readmissionRate < T.readmissionRate ? "success" : "danger"}">${indicators.readmissionRate < T.readmissionRate ? "COMPLIANT" : "NON-COMPLIANT"}</span></td>
          </tr>
        </tbody>
      </table>

      <div class="section-title">Data Quality Audit</div>
      <table>
        <thead>
          <tr>
            <th style="width: 60%">Audit Checkpoint</th>
            <th style="width: 20%">Count</th>
            <th style="width: 20%">Impact</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Missing Discharge Diagnoses</td>
            <td>${gaps.missingDiagnoses || 0}</td>
            <td><span class="status-text ${gaps.missingDiagnoses > 0 ? "danger" : "success"}">${gaps.missingDiagnoses > 0 ? "HIGH" : "NONE"}</span></td>
          </tr>
          <tr>
            <td>Untracked Surgical Infections</td>
            <td>${gaps.untrackedInfections || 0}</td>
            <td><span class="status-text ${gaps.untrackedInfections > 0 ? "danger" : "success"}">${gaps.untrackedInfections > 0 ? "CRITICAL" : "NONE"}</span></td>
          </tr>
          <tr>
            <td>Empty OPD Arrival Timestamps</td>
            <td>${gaps.emptyArrivalTimes || 0}</td>
            <td><span class="status-text ${gaps.emptyArrivalTimes > 0 ? "warning" : "success"}">${gaps.emptyArrivalTimes > 0 ? "LOW" : "NONE"}</span></td>
          </tr>
        </tbody>
      </table>


      <div class="signatures">
        <div class="sign-line">Quality Manager</div>
        <div class="sign-line">Medical Superintendent</div>
      </div>

      <div class="footer">
        CureChain Hospital Management System | Generated on ${new Date().toLocaleString()}
      </div>
    </body>
    </html>
  `;
};
