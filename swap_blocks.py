file_path = r"c:\AppServ\www\Dashboard\src\pages\Dashboard\DashboardPage.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

p1 = content.find("                    {/* Department Salesperson Detail */}")
p2 = content.find("                    {/* Department Product Detail — Side-by-Side Tables */}")
p3 = content.find("                </>", p2)

if p1 != -1 and p2 != -1 and p3 != -1:
    before = content[:p1]
    salesperson = content[p1:p2]
    product = content[p2:p3]
    after = content[p3:]
    
    new_content = before + product + salesperson + after
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(new_content)
    print("Success")
else:
    print("Not found", p1, p2, p3)
