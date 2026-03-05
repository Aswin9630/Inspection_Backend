const PaymentTransaction = require("../../models/QuickInspection/PaymentTransaction");

exports.getCustomerWalletController = async (req, res) => {
  try {
    const transactions = await PaymentTransaction.find({ customer: req.user._id })
      .populate("company", "companyName")
      .sort({ paidAt: -1 });

    const totalSpent = transactions.reduce((sum, t) => sum + t.totalAmount, 0);
    const totalGstPaid = transactions.reduce((sum, t) => sum + (t.gstAmount || 0), 0);

    return res.status(200).json({
      success: true,
      data: {
        transactions,
        summary: {
          totalSpent,
          totalGstPaid,
          totalTransactions: transactions.length
        }
      }
    });
  } catch (err) {
    console.error("getCustomerWalletController error:", err);
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

exports.getCompanyWalletController = async (req, res) => {
  try {
    const transactions = await PaymentTransaction.find({ company: req.user._id })
      .populate("customer", "name")
      .sort({ paidAt: -1 });

    const totalEarned = transactions.reduce((sum, t) => sum + t.companyEarnings, 0);
    const pendingPayout = transactions.filter((t) => !t.companyPaidOut).reduce((sum, t) => sum + t.companyEarnings, 0);
    const completedPayout = transactions.filter((t) => t.companyPaidOut).reduce((sum, t) => sum + t.companyEarnings, 0);

    return res.status(200).json({
      success: true,
      data: {
        transactions,
        summary: {
          totalEarned,
          pendingPayout,
          completedPayout,
          totalTransactions: transactions.length
        }
      }
    });
  } catch (err) {
    console.error("getCompanyWalletController error:", err);
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};