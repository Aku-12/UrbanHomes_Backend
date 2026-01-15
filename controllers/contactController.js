const Contact = require('../models/contactModel');
const sendEmail = require('../utils/sendEmail');

// Submit contact form
exports.submitContact = async (req, res) => {
  try {
    const { name, email, subject, message, phone } = req.body;

    const contact = await Contact.create({
      name,
      email,
      subject,
      message,
      phone
    });

    // Optional: Send confirmation email to user
    try {
      await sendEmail({
        email: email,
        subject: 'Contact Form Received',
        message: `Dear ${name},\n\nThank you for contacting us. We have received your message and will get back to you soon.\n\nSubject: ${subject}\nMessage: ${message}\n\nBest regards,\nUrbanHomes Team`
      });
    } catch (emailError) {
      console.log('Email sending failed:', emailError);
      // Don't fail the request if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Contact form submitted successfully',
      contact: {
        id: contact._id,
        name: contact.name,
        email: contact.email,
        subject: contact.subject,
        status: contact.status,
        createdAt: contact.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all contacts (Admin only)
exports.getContacts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const skip = (page - 1) * limit;

    let filter = {};
    if (status) {
      filter.status = status;
    }

    const contacts = await Contact.find(filter)
      .populate('replies.repliedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Contact.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: contacts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalContacts: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get single contact (Admin only)
exports.getContact = async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id)
      .populate('replies.repliedBy', 'firstName lastName');

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    res.status(200).json({
      success: true,
      data: contact
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update contact status (Admin only)
exports.updateContactStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['unread', 'read', 'replied'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be unread, read, or replied'
      });
    }

    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Contact status updated successfully',
      data: contact
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete contact (Admin only)
exports.deleteContact = async (req, res) => {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Contact deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Reply to contact (Admin only)
exports.replyToContact = async (req, res) => {
  try {
    const { message } = req.body;
    const contactId = req.params.id;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Reply message is required'
      });
    }

    const contact = await Contact.findById(contactId);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    // Add reply to the contact
    contact.replies.push({
      message: message.trim(),
      repliedBy: req.user._id,
      repliedAt: new Date()
    });
    contact.status = 'replied';
    await contact.save();

    // Send email notification to the user
    try {
      await sendEmail({
        email: contact.email,
        subject: `Re: ${contact.subject}`,
        message: `Dear ${contact.name},\n\nThank you for contacting us. Here is our response to your inquiry:\n\n${message}\n\nOriginal Message:\n"${contact.message}"\n\nBest regards,\nUrbanHomes Team`
      });
    } catch (emailError) {
      console.log('Email sending failed:', emailError);
      // Don't fail the request if email fails
    }

    // Populate the repliedBy field before sending response
    await contact.populate('replies.repliedBy', 'firstName lastName');

    res.status(200).json({
      success: true,
      message: 'Reply sent successfully',
      data: contact
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get contacts by email (for users to view their messages)
exports.getContactsByEmail = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const contacts = await Contact.find({ email: email.toLowerCase() })
      .populate('replies.repliedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: contacts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};