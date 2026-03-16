// ========== CONFIGURATION ==========
const CONFIG = {
  SHEET_NAMES: {
    USERS: "Users",
    EMPLOYEE: "ข้อมูลพนักงาน",
    ATTENDANCE: "วันมาทำงาน",
    SALES: "Data",
    CALL_STATUS: "สถานะการโทร",
    DAILY_CHECK_IN: "DailyCheckIn"
  },
  PASSWORD_SALT: "MySuperSecretSaltForHashingPasswords@2025" 
};

// ========== UTILITY & AUTH FUNCTIONS ==========
function CREATE_PASSWORD_HASH() {
  try {
    const ui = SpreadsheetApp.getUi();
    const response = ui.prompt('สร้าง Hash สำหรับรหัสผ่าน', 'กรุณาป้อนรหัสผ่านที่ต้องการเข้ารหัส:', ui.ButtonSet.OK_CANCEL);
    if (response.getSelectedButton() == ui.Button.OK) {
      const password = response.getResponseText();
      if (password) {
        const hashedPassword = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password + CONFIG.PASSWORD_SALT)
          .map(byte => ('0' + (byte & 0xFF).toString(16)).slice(-2))
          .join('');
        Logger.log(`Password: "${password}"`);
        Logger.log(`Hashed Value: ${hashedPassword}`);
        ui.alert('สร้าง Hash สำเร็จ', 'กรุณาดูค่า Hash ที่ได้จากเมนู View > Logs (Ctrl+Enter) แล้วนำไปใส่ในชีต Users', ui.ButtonSet.OK);
      }
    }
  } catch (e) {
    Logger.log(`Error creating password hash: ${e.message}`);
    SpreadsheetApp.getUi().alert('เกิดข้อผิดพลาดในการสร้าง Hash');
  }
}

function authenticateUser(username, password) {
  try {
    const userSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.USERS);
    if (!userSheet) return { success: false, message: "ไม่พบชีตผู้ใช้งาน (Users)" };
    const users = sheetToJSON(userSheet);
    const foundUser = users.find(u => u.User === username);
    if (!foundUser) return { success: false, message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
    const hashedPassword = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password + CONFIG.PASSWORD_SALT)
      .map(byte => ('0' + (byte & 0xFF).toString(16)).slice(-2))
      .join('');
    if (hashedPassword === foundUser.Password) {
      return { success: true, name: foundUser.Name, team: foundUser.Team };
    } else {
      return { success: false, message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
    }
  } catch (e) {
    Logger.log(`Authentication Error: ${e.message}`);
    return { success: false, message: `เกิดข้อผิดพลาดฝั่ง Server: ${e.message}` };
  }
}

function submitDailyCheckIn(checkedInEmployeeIds, userInfo) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.DAILY_CHECK_IN);
    if (!sheet) {
      return { success: false, message: "ไม่พบชีต DailyCheckIn", savedCount: 0 };
    }

    const timezone = "Asia/Bangkok";
    const format = "yyyy-MM-dd";
    const todayStr = Utilities.formatDate(new Date(), timezone, format);

    const data = sheet.getDataRange().getValues();
    const headers = data.shift();
    const empIdColIndex = headers.indexOf("EmployeeID");
    const dateColIndex = headers.indexOf("Date");
    
    if (dateColIndex === -1 || empIdColIndex === -1) {
        return { success: false, message: "ไม่พบคอลัมน์ EmployeeID หรือ Date ในชีต DailyCheckIn", savedCount: 0 };
    }

    const existingTodaysCheckins = new Set();
    data.forEach(row => {
      const valueFromDateColumn = row[dateColIndex];
      if (valueFromDateColumn) {
        let rowDateStr;
        if (valueFromDateColumn instanceof Date) {
          rowDateStr = Utilities.formatDate(valueFromDateColumn, timezone, format);
        } else {
          rowDateStr = String(valueFromDateColumn).trim().split(' ')[0];
        }
        
        if (rowDateStr === todayStr) {
          existingTodaysCheckins.add(String(row[empIdColIndex]));
        }
      }
    });

    const newEmployeesToSave = checkedInEmployeeIds.filter(id => !existingTodaysCheckins.has(String(id)));
    const duplicateCount = checkedInEmployeeIds.length - newEmployeesToSave.length;

    const dataToAppend = [];
    if (newEmployeesToSave.length > 0) {
      newEmployeesToSave.forEach(empId => {
        dataToAppend.push([ new Date(), userInfo.name, empId, todayStr ]);
      });
      sheet.getRange(sheet.getLastRow() + 1, 1, dataToAppend.length, dataToAppend[0].length).setValues(dataToAppend);
    }
    
    let message = "";
    if (newEmployeesToSave.length > 0) {
        message += `บันทึกการเช็คชื่อ ${newEmployeesToSave.length} คนสำเร็จ!`;
    }
    if (duplicateCount > 0) {
        message += `\n(พบ ${duplicateCount} รายการที่เช็คชื่อไปแล้วและถูกข้ามไป)`;
    }
     if (newEmployeesToSave.length === 0 && duplicateCount > 0) {
        message = "พนักงานที่คุณเลือกทั้งหมดถูกเช็คชื่อไปแล้วสำหรับวันนี้";
    }

    return { success: true, message: message, savedCount: newEmployeesToSave.length };

  } catch (e) {
    Logger.log(`Check-in submission error: ${e.message}`);
    return { success: false, message: `เกิดข้อผิดพลาด: ${e.message}`, savedCount: 0 };
  }
}

// ========== CORE FUNCTIONS ==========
function doGet(e) {
  return HtmlService.createTemplateFromFile('index').evaluate()
      .setTitle("Sales Team Dashboard")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function createYearlyMetricsObject(createMonthlySlots) {
  const metrics = [
      'totalSales', 'bioSales', 'fertilizerSales', 'orderCount',
      'bioOrderCount', 'fertilizerOrderCount', 'callDurationSec',
      'connectedCalls', 'totalCalls',
      'fertLargeSales', 'fertSmallSales', 'fertLargeOrderCount', 'fertSmallOrderCount'
  ];
  return metrics.reduce((obj, metric) => {
      obj[metric] = createMonthlySlots();
      return obj;
  }, {});
}

function ensureYearlyMetrics(employee, year, createMonthlySlots) {
  if (!employee.yearlyMetrics[year]) {
    employee.yearlyMetrics[year] = createYearlyMetricsObject(createMonthlySlots);
  }
}

function getPreAggregatedData(userInfo) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    Logger.log(`เริ่มต้นการประมวลผลข้อมูลสำหรับ User: ${userInfo.name}, Team: ${userInfo.team}`);

    const employee_sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.EMPLOYEE);
    const attendance_sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.ATTENDANCE);
    const sales_sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SALES);
    const call_status_sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.CALL_STATUS);
    const checkin_sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.DAILY_CHECK_IN);

    if (!employee_sheet || !attendance_sheet || !sales_sheet || !call_status_sheet) {
      throw new Error("ไม่พบชีตข้อมูลที่จำเป็น");
    }

    let all_employee_df_for_lookups = sheetToJSON(employee_sheet);
    let employee_df = [...all_employee_df_for_lookups];

    if (userInfo.team !== 'All') {
        employee_df = employee_df.filter(emp => emp.Team === userInfo.team);
    }

    const attendance_df = sheetToJSON(attendance_sheet);
    const sales_df = sheetToJSON(sales_sheet);
    const call_status_df = sheetToJSON(call_status_sheet);
    const checkin_df = checkin_sheet ? sheetToJSON(checkin_sheet) : [];

    let checkedInToday = [];
    if (userInfo.team !== 'All') {
        const todayStr = Utilities.formatDate(new Date(), "Asia/Bangkok", "yyyy-MM-dd");
        const checkedInIDsForToday = new Set();
        checkin_df.forEach(checkin => {
            if (String(checkin.Date).trim() === todayStr) {
                checkedInIDsForToday.add(String(checkin.EmployeeID));
            }
        });
        checkedInToday = Array.from(checkedInIDsForToday);
    }
    
    const combinedAttendance = {};
    attendance_df.forEach(att => {
      const empId = Number(att.รหัสพนักงาน);
      const year = Number(att.ปี);
      const monthIndex = Number(att.เดือน) - 1;
      if (!combinedAttendance[empId]) combinedAttendance[empId] = {};
      if (!combinedAttendance[empId][year]) combinedAttendance[empId][year] = {};
      combinedAttendance[empId][year][monthIndex] = Number(att.วันทำงาน) || 0;
    });
    const checkinCounts = {};
    checkin_df.forEach(checkin => {
        const empId = Number(checkin.EmployeeID);
        const date = new Date(checkin.Date); 
        if (checkin.Date && !isNaN(date)) {
            const year = date.getFullYear();
            const monthIndex = date.getMonth();
            const dateStr = String(checkin.Date).trim();
            if (!checkinCounts[empId]) checkinCounts[empId] = {};
            if (!checkinCounts[empId][year]) checkinCounts[empId][year] = {};
            if (!checkinCounts[empId][year][monthIndex]) checkinCounts[empId][year][monthIndex] = new Set();
            checkinCounts[empId][year][monthIndex].add(dateStr);
        }
    });
    for (const empId in checkinCounts) {
        if (!combinedAttendance[empId]) combinedAttendance[empId] = {};
        for (const year in checkinCounts[empId]) {
            if (!combinedAttendance[empId][year]) combinedAttendance[empId][year] = {};
            for (const monthIndex in checkinCounts[empId][year]) {
                combinedAttendance[empId][year][monthIndex] = checkinCounts[empId][year][monthIndex].size;
            }
        }
    }

    const createMonthlySlots = () => new Array(12).fill(0);
    let employeesData = {};
    let productsData = {};
    let salesByProdCatAndCustType = {};
    let categoryMonthlyMetrics = {};
    let totalSalesByYearMonth = {};
    let dailyCallMetricsByEmployee = {};
    let detailedEmployeeMetrics = {};
    let productMetricsByEmployee = {};
    let customerTypeMetricsByEmployee = {};
    let dailySalesMetricsByEmployee = {};

    const allYears = new Set();
    const phoneNoToEmpIdMap = new Map();
    const validEmpIds = new Set(all_employee_df_for_lookups.map(emp => Number(emp.รหัสพนักงาน)));

    all_employee_df_for_lookups.forEach(emp => {
      const empId = Number(emp.รหัสพนักงาน);
      if (!empId || isNaN(empId)) return;
      phoneNoToEmpIdMap.set(String(emp.ประเภทเบอร์).trim(), empId);
      employeesData[empId] = {
        employeeInfo: { id: empId, name: emp.รายชื่อ || 'ไม่ระบุ', position: emp.ตำแหน่ง || 'ไม่ระบุ', team: emp.Team || 'N/A', phone: emp.ประเภทเบอร์ || 'ไม่ระบุ' },
        yearlyMetrics: {}, callStatusMetrics: {}, attendanceMetrics: {}
      };
      if (combinedAttendance[empId]) {
          for (const year in combinedAttendance[empId]) {
              if (!employeesData[empId].attendanceMetrics[year]) {
                  employeesData[empId].attendanceMetrics[year] = { workDays: createMonthlySlots(), lateMinutes: createMonthlySlots() };
              }
              for (const monthIndex in combinedAttendance[empId][year]) {
                  employeesData[empId].attendanceMetrics[year].workDays[monthIndex] = combinedAttendance[empId][year][monthIndex];
              }
          }
      }
      detailedEmployeeMetrics[empId] = {
        salesByProductCategory: {}, salesByProductName: {}, yearlySalesByCategory: {}, monthlySalesByCategory: {}
      };
    });
    
    const supervisors = all_employee_df_for_lookups.filter(e => e.ตำแหน่ง === 'supervisor');
    const teamNameMap = new Map(supervisors.map(s => [s.Team, `ทีม${s.รายชื่อ}`]));

    sales_df.forEach(sale => {
      const empId = Number(sale.รหัสพนักงาน);
      if (!validEmpIds.has(empId)) return;
      
      const date = sale.วันที่;
      const price = Number(sale.ราคา) || 0;
      const quantity = (Number(sale.เล็ก) || 0) + (Number(sale.ใหญ่) || 0);
      
      if (date instanceof Date && !isNaN(date) && (price > 0 || quantity > 0)) {
        const year = date.getFullYear();
        const monthIndex = date.getMonth();
        allYears.add(year);
        const productCat = sale.ประเภทสินค้า ? String(sale.ประเภทสินค้า).trim() : 'ไม่ระบุ';
        const productName = sale.สินค้า ? String(sale.สินค้า).trim() : 'ไม่ระบุ';
        
        const dateString = Utilities.formatDate(date, "Asia/Bangkok", "yyyy-MM-dd");
        if (!dailySalesMetricsByEmployee[empId]) dailySalesMetricsByEmployee[empId] = {};
        dailySalesMetricsByEmployee[empId][dateString] = (dailySalesMetricsByEmployee[empId][dateString] || 0) + price;

        if (!totalSalesByYearMonth[year]) totalSalesByYearMonth[year] = createMonthlySlots();
        totalSalesByYearMonth[year][monthIndex] += price;
        if (employeesData[empId]) {
          ensureYearlyMetrics(employeesData[empId], year, createMonthlySlots);
          const empMetrics = employeesData[empId].yearlyMetrics[year];
          empMetrics.orderCount[monthIndex] += 1;
          empMetrics.totalSales[monthIndex] += price;
          if (productCat === 'ชีวภัณฑ์') { 
            empMetrics.bioSales[monthIndex] += price; 
            empMetrics.bioOrderCount[monthIndex] += 1; 
          } 
          else if (productCat === 'ปุ๋ยกระสอบใหญ่') { 
            empMetrics.fertilizerSales[monthIndex] += price; 
            empMetrics.fertilizerOrderCount[monthIndex] += 1;
            empMetrics.fertLargeSales[monthIndex] += price;
            empMetrics.fertLargeOrderCount[monthIndex] += 1;
          }
          else if (productCat === 'ปุ๋ยกระสอบเล็ก') {
            empMetrics.fertilizerSales[monthIndex] += price; 
            empMetrics.fertilizerOrderCount[monthIndex] += 1;
            empMetrics.fertSmallSales[monthIndex] += price;
            empMetrics.fertSmallOrderCount[monthIndex] += 1;
          }
          const detail = detailedEmployeeMetrics[empId];
          if (productCat !== 'ของแถม') {
              detail.salesByProductCategory[productCat] = (detail.salesByProductCategory[productCat] || 0) + price;
              if(!detail.monthlySalesByCategory[year]) detail.monthlySalesByCategory[year] = {};
              if(!detail.monthlySalesByCategory[year][productCat]) detail.monthlySalesByCategory[year][productCat] = createMonthlySlots();
              detail.monthlySalesByCategory[year][productCat][monthIndex] += price;
          }
          if (productName !== 'ไม่ระบุ' && productCat !== 'ของแถม') { detail.salesByProductName[productName] = (detail.salesByProductName[productName] || 0) + price; }
          if(productCat !== 'ของแถม') {
            if(!detail.yearlySalesByCategory[year]) detail.yearlySalesByCategory[year] = {};
            detail.yearlySalesByCategory[year][productCat] = (detail.yearlySalesByCategory[year][productCat] || 0) + price;
          }
        }
        if (productName !== 'ไม่ระบุ') {
          if (!productsData[productName]) productsData[productName] = { yearlySales: {}, yearlyQuantity: {} };
          if (!productsData[productName].yearlySales[year]) productsData[productName].yearlySales[year] = createMonthlySlots();
          if (!productsData[productName].yearlyQuantity[year]) productsData[productName].yearlyQuantity[year] = createMonthlySlots();
          productsData[productName].yearlySales[year][monthIndex] += price;
          productsData[productName].yearlyQuantity[year][monthIndex] += quantity;
        }
        if (productCat) {
          if (!categoryMonthlyMetrics[productCat]) categoryMonthlyMetrics[productCat] = { sales: {}, quantity: {} };
          if (!categoryMonthlyMetrics[productCat].sales[year]) categoryMonthlyMetrics[productCat].sales[year] = createMonthlySlots();
          if (!categoryMonthlyMetrics[productCat].quantity[year]) categoryMonthlyMetrics[productCat].quantity[year] = createMonthlySlots();
          categoryMonthlyMetrics[productCat].sales[year][monthIndex] += price;
          categoryMonthlyMetrics[productCat].quantity[year][monthIndex] += quantity;
        }

        const custType = sale.ประเภทลูกค้า;
        if (productCat && (custType === 'ลูกค้าใหม่' || custType === 'รีออเดอร์')) {
          if (!salesByProdCatAndCustType[productCat]) salesByProdCatAndCustType[productCat] = { 'ลูกค้าใหม่': { sales: {}, quantity: {} }, 'รีออเดอร์': { sales: {}, quantity: {} } };
          if (!salesByProdCatAndCustType[productCat][custType].sales[year]) salesByProdCatAndCustType[productCat][custType].sales[year] = createMonthlySlots();
          if (!salesByProdCatAndCustType[productCat][custType].quantity[year]) salesByProdCatAndCustType[productCat][custType].quantity[year] = createMonthlySlots();
          salesByProdCatAndCustType[productCat][custType].sales[year][monthIndex] += price;
          salesByProdCatAndCustType[productCat][custType].quantity[year][monthIndex] += quantity;
        }

        if (productName !== 'ไม่ระบุ') {
            if (!productMetricsByEmployee[empId]) productMetricsByEmployee[empId] = {};
            if (!productMetricsByEmployee[empId][productName]) productMetricsByEmployee[empId][productName] = { yearlySales: {}, yearlyQuantity: {} };
            if (!productMetricsByEmployee[empId][productName].yearlySales[year]) productMetricsByEmployee[empId][productName].yearlySales[year] = createMonthlySlots();
            if (!productMetricsByEmployee[empId][productName].yearlyQuantity[year]) productMetricsByEmployee[empId][productName].yearlyQuantity[year] = createMonthlySlots();
            productMetricsByEmployee[empId][productName].yearlySales[year][monthIndex] += price;
            productMetricsByEmployee[empId][productName].yearlyQuantity[year][monthIndex] += quantity;
        }
        if (productCat && (custType === 'ลูกค้าใหม่' || custType === 'รีออเดอร์')) {
            if (!customerTypeMetricsByEmployee[empId]) customerTypeMetricsByEmployee[empId] = {};
            if (!customerTypeMetricsByEmployee[empId][productCat]) customerTypeMetricsByEmployee[empId][productCat] = { 'ลูกค้าใหม่': { sales: {}, quantity: {} }, 'รีออเดอร์': { sales: {}, quantity: {} } };
            if (!customerTypeMetricsByEmployee[empId][productCat][custType].sales[year]) customerTypeMetricsByEmployee[empId][productCat][custType].sales[year] = createMonthlySlots();
            if (!customerTypeMetricsByEmployee[empId][productCat][custType].quantity[year]) customerTypeMetricsByEmployee[empId][productCat][custType].quantity[year] = createMonthlySlots();
            customerTypeMetricsByEmployee[empId][productCat][custType].sales[year][monthIndex] += price;
            customerTypeMetricsByEmployee[empId][productCat][custType].quantity[year][monthIndex] += quantity;
        }
      }
    });

    call_status_df.forEach(call => {
      const phoneNo = call.เบอร์ ? String(call.เบอร์).trim() : null;
      const empId = phoneNoToEmpIdMap.get(phoneNo);
      if (!validEmpIds.has(empId)) return;
      const callDate = call.วันที่;
      const callType = call.ประเภท ? String(call.ประเภท).trim() : '';
      if (empId && callDate instanceof Date && !isNaN(callDate) && (callType === '1' || callType === '2' || callType === '3' || callType === '4')) {
        const year = callDate.getFullYear();
        const monthIndex = callDate.getMonth();
        const day = callDate.getDate();
        allYears.add(year);
        ensureYearlyMetrics(employeesData[empId], year, createMonthlySlots);
        if (!employeesData[empId].callStatusMetrics[year]) {
            employeesData[empId].callStatusMetrics[year] = { durationMinutes: createMonthlySlots(), weeklyDuration: Array.from({ length: 12 }, () => [0, 0, 0, 0]) };
        }
        const callCount = Number(call['Count of ID']) || 0;
        const durationMins = Number(call['Sum of คิดเป็นนาที']) || 0;
        const isConnected = (String(call['ได้คุย']).trim() === '1');
        const yearlyMetrics = employeesData[empId].yearlyMetrics[year];
        yearlyMetrics.totalCalls[monthIndex] += callCount;
        yearlyMetrics.callDurationSec[monthIndex] += (durationMins * 60);
        if (isConnected) yearlyMetrics.connectedCalls[monthIndex] += callCount;
        employeesData[empId].callStatusMetrics[year].durationMinutes[monthIndex] += durationMins;
        let weekIndex;
        if (day <= 7) weekIndex = 0; else if (day <= 14) weekIndex = 1; else if (day <= 22) weekIndex = 2; else weekIndex = 3;
        if (weekIndex !== undefined) employeesData[empId].callStatusMetrics[year].weeklyDuration[monthIndex][weekIndex] += durationMins;
        const timezoneOffset = callDate.getTimezoneOffset() * 60000;
        const localDate = new Date(callDate.getTime() - timezoneOffset);
        const dateString = localDate.toISOString().split('T')[0];
        if (!dailyCallMetricsByEmployee[empId]) dailyCallMetricsByEmployee[empId] = {};
        if (!dailyCallMetricsByEmployee[empId][dateString]) dailyCallMetricsByEmployee[empId][dateString] = { totalCalls: 0, connectedCalls: 0, durationMinutes: 0 };
        const dailyMetrics = dailyCallMetricsByEmployee[empId][dateString];
        dailyMetrics.totalCalls += callCount;
        dailyMetrics.durationMinutes += durationMins;
        if (isConnected) dailyMetrics.connectedCalls += callCount;
      }
    });

    let teamsData = {};
    all_employee_df_for_lookups.forEach(emp => {
      const teamLetter = emp.Team;
      if (userInfo.team !== 'All' && userInfo.team !== teamLetter) return;
      const teamName = teamNameMap.get(teamLetter) || `ทีม${teamLetter || 'ไม่ระบุ'}`;
      if (!teamsData[teamName]) {
        teamsData[teamName] = [];
      }
      const empData = employeesData[emp.รหัสพนักงาน];
      if (empData) {
        teamsData[teamName].push(empData);
      }
    });
    for (const teamName in teamsData) {
        let topPerformerTotalSales = -1, topPerformerId = null;
        teamsData[teamName].forEach(member => {
            member.totalSalesAllTime = Object.values(member.yearlyMetrics).reduce((yearSum, yearData) => yearSum + yearData.totalSales.reduce((monthSum, sales) => monthSum + sales, 0), 0);
            if (member.employeeInfo.position !== 'supervisor' && member.totalSalesAllTime > topPerformerTotalSales) {
                topPerformerTotalSales = member.totalSalesAllTime;
                topPerformerId = member.employeeInfo.id;
            }
        });
        if (topPerformerId) {
            const topPerformerInTeam = teamsData[teamName].find(m => m.employeeInfo.id === topPerformerId);
            if (topPerformerInTeam) topPerformerInTeam.isTeamTopPerformer = true;
        }
        teamsData[teamName].sort((a, b) => {
            if (a.employeeInfo.position === 'supervisor') return -1;
            if (b.employeeInfo.position === 'supervisor') return 1;
            return b.totalSalesAllTime - a.totalSalesAllTime;
        });
    }

    const finalEmployeeDataInOrder = employee_df
      .map(emp => employeesData[emp.รหัสพนักงาน])
      .filter(Boolean);

    const allEmployeesWithTotal = Object.values(employeesData).map(emp => ({ ...emp, totalSalesAllTime: Object.values(emp.yearlyMetrics).reduce((yearSum, monthlyData) => yearSum + (monthlyData.totalSales ? monthlyData.totalSales.reduce((monthSum, sales) => monthSum + sales, 0) : 0), 0) }));
    const topEmployeeOverall = allEmployeesWithTotal.reduce((max, current) => (current.totalSalesAllTime > max.totalSalesAllTime) ? current : max, {totalSalesAllTime: -1});
    const salesByCategory = sheetToJSON(sales_sheet).reduce((acc, s) => { if (s.ประเภทสินค้า && s.ประเภทสินค้า !== 'ของแถม' && !isNaN(parseFloat(s.ราคา))) { acc[s.ประเภทสินค้า] = (acc[s.ประเภทสินค้า] || 0) + parseFloat(s.ราคา); } return acc; }, {});
    const categoryDataForChart = [['ประเภทสินค้า', 'ยอดขายรวม']].concat(Object.entries(salesByCategory));
    
    Logger.log("การประมวลผลสำเร็จ");
    return {
      allEmployeesForFilter: all_employee_df_for_lookups.map(e => ({id: e.รหัสพนักงาน, name: e.รายชื่อ})),
      employeeData: finalEmployeeDataInOrder,
      teamsData: teamsData,
      productsData: productsData,
      salesByProdCatAndCustType: salesByProdCatAndCustType,
      categoryMonthlyMetrics: categoryMonthlyMetrics,
      totalSalesByYearMonth: totalSalesByYearMonth,
      categoryDataForChart: categoryDataForChart,
      dailyCallMetricsByEmployee: dailyCallMetricsByEmployee,
      detailedEmployeeMetrics: detailedEmployeeMetrics,
      allYears: Array.from(allYears).sort((a, b) => a - b),
      kpi: {
        topEmployeeName: topEmployeeOverall.employeeInfo ? topEmployeeOverall.employeeInfo.name : 'N/A',
        topEmployeeId: topEmployeeOverall.employeeInfo ? topEmployeeOverall.employeeInfo.id : null,
      },
      checkedInToday: [...new Set(checkedInToday)],
      productMetricsByEmployee: productMetricsByEmployee,
      customerTypeMetricsByEmployee: customerTypeMetricsByEmployee,
      dailySalesMetricsByEmployee: dailySalesMetricsByEmployee
    };
  } catch (e) {
    Logger.log(`เกิดข้อผิดพลาดรุนแรง: ${e.message}\n${e.stack}`);
    return { error: `เกิดข้อผิดพลาดฝั่ง Server: ${e.message}` };
  }
}

function sheetToJSON(sheet) {
  if (!sheet) return [];
  const dataRange = sheet.getDataRange();
  if (dataRange.getNumRows() <= 1) return [];
  const values = dataRange.getValues();
  const header = values.shift().map(h => String(h).trim());
  const dateColumnsToParse = ['วันที่']; 
  return values.map(row => {
    let obj = {};
    header.forEach((col, index) => {
        let value = row[index];
        if (dateColumnsToParse.includes(col)) {
          if (value instanceof Date && !isNaN(value)) {
            obj[col] = value;
          } else if (typeof value === 'string' && value.length > 0) {
            const timestamp = Date.parse(value);
            obj[col] = isNaN(timestamp) ? value : new Date(timestamp);
          } else {
            obj[col] = value;
          }
        } else {
           obj[col] = value;
        }
    });
    return obj;
  });
}