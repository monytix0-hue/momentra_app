🧠 PERSONAL MODULE — FULL MICRO SYSTEM
1. 🧩 SYSTEM OVERVIEW
Core Definition
👉 Personal = Behavior-driven financial control system
Core Loop
Track → Understand → Predict → Adjust
Core Objects
User
PersonalMoment
Transaction
Budget
Goal
Cycle
Signal
Insight
Core Metric
👉 Money Left
2. 🗄️ SQL SCHEMA (DETAILED)
2.1 users
CREATE TABLE users (
    user_id UUID PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(150) UNIQUE,
    created_at TIMESTAMP DEFAULT now()
);
2.2 personal_moments
CREATE TABLE personal_moments (
    moment_id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(user_id),
    title VARCHAR(255),
    moment_type VARCHAR(50), -- budget, goal, debt
    duration_type VARCHAR(20), -- one_time, ongoing
    target_amount NUMERIC(12,2),
    start_date DATE,
    end_date DATE,
    status VARCHAR(20),
    created_at TIMESTAMP DEFAULT now()
);
2.3 cycles (monthly engine)
CREATE TABLE personal_cycles (
    cycle_id UUID PRIMARY KEY,
    moment_id UUID REFERENCES personal_moments(moment_id),
    label VARCHAR(50), -- Jan 2026
    start_date DATE,
    end_date DATE,
    allocated_budget NUMERIC(12,2),
    spent_amount NUMERIC(12,2) DEFAULT 0
);
2.4 transactions
CREATE TABLE personal_transactions (
    transaction_id UUID PRIMARY KEY,
    user_id UUID,
    moment_id UUID,
    cycle_id UUID,
    amount NUMERIC(12,2),
    category VARCHAR(50),
    merchant VARCHAR(255),
    description TEXT,
    transaction_date DATE,
    created_at TIMESTAMP DEFAULT now()
);
2.5 budgets
CREATE TABLE personal_budgets (
    budget_id UUID PRIMARY KEY,
    cycle_id UUID,
    category VARCHAR(50),
    allocated_amount NUMERIC(12,2),
    spent_amount NUMERIC(12,2) DEFAULT 0
);
2.6 goals
CREATE TABLE personal_goals (
    goal_id UUID PRIMARY KEY,
    user_id UUID,
    title VARCHAR(255),
    target_amount NUMERIC(12,2),
    saved_amount NUMERIC(12,2),
    target_date DATE
);
2.7 signals
CREATE TABLE personal_signals (
    signal_id UUID PRIMARY KEY,
    user_id UUID,
    signal_type VARCHAR(50),
    severity VARCHAR(10),
    message TEXT,
    created_at TIMESTAMP DEFAULT now()
);
3. ⚙️ FASTAPI BACKEND
3.1 Project Structure
app/
 ├── main.py
 ├── models/
 ├── schemas/
 ├── routes/
 ├── services/
 ├── core/
3.2 Models (SQLAlchemy)
class Transaction(Base):
    __tablename__ = "personal_transactions"

    transaction_id = Column(UUID, primary_key=True)
    user_id = Column(UUID)
    amount = Column(Numeric)
    category = Column(String)
    transaction_date = Column(Date)
3.3 Schemas (Pydantic)
class TransactionCreate(BaseModel):
    amount: float
    category: str
    date: date
3.4 Routes
Add transaction
@router.post("/transactions")
def add_transaction(data: TransactionCreate, db: Session):
    txn = Transaction(**data.dict())
    db.add(txn)
    db.commit()
    return txn
Get summary
@router.get("/summary")
def get_summary(user_id: UUID, db: Session):
    total_spent = db.query(func.sum(Transaction.amount)).scalar()
    return {"spent": total_spent}
3.5 Services (Business Logic)
def calculate_money_left(budget, spent):
    return budget - spent
3.6 Signal Engine
def generate_signals(user_id):
    if spent > budget:
        return "Overspending detected"
4. 📱 iOS (SwiftUI)
4.1 Structure
PersonalHomeView
 ├── SummaryCard
 ├── TransactionsList
 ├── InsightsView
 ├── AddTransactionSheet
4.2 ViewModel
class PersonalViewModel: ObservableObject {
    @Published var transactions: [Transaction] = []
    
    func fetchTransactions() {
        // API call
    }
}
4.3 UI Example
Text("Money Left")
    .font(.title)
Text("₹24,500")
    .font(.largeTitle)
4.4 Add Transaction
Button("+ Add Transaction") {
    showSheet = true
}
5. 🤖 ANDROID (Jetpack Compose)
5.1 Structure
PersonalScreen
 ├── SummaryCard
 ├── TransactionList
 ├── AddTransactionButton
5.2 ViewModel
class PersonalViewModel : ViewModel() {
    val transactions = mutableStateListOf<Transaction>()
}
5.3 UI
Text("Money Left", style = MaterialTheme.typography.h5)
Text("₹24,500", style = MaterialTheme.typography.h3)
6. 🌐 NEXT.JS (WEB)
6.1 Structure
/pages/personal
/components
/hooks
/services
6.2 API call
export async function fetchTransactions() {
  return fetch("/api/transactions").then(res => res.json())
}
6.3 UI
<div>
  <h2>Money Left</h2>
  <h1>₹24,500</h1>
</div>
7. 🧠 AI / INSIGHTS LAYER
Examples
“You’re spending 20% more this month”
“Dining is highest category”
“You may run out of money in 8 days”
Backend logic
def predict_burn_rate(transactions):
    return avg_daily_spend * remaining_days
8. 🔥 SIGNALS (USER EXPERIENCE)
Trigger Bar Examples
“You’re close to your budget limit”
“High spending this week”
“You saved more than usual 🎉”
9. 🎯 FINAL PERSONAL SYSTEM
What user feels
clear control
awareness
prediction
guidance
What system does
tracks behavior
detects patterns
predicts outcomes
nudges actions
