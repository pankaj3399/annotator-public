# Veem Payment Integration Guide for Project Management Platform

## Table of Contents
1. [Project Setup](#project-setup)
2. [Environment Configuration](#environment-configuration)
3. [User Model](#user-model)
4. [Payment Model](#payment-model)
5. [Veem Integration Service](#veem-integration-service)
6. [Webhook Handling](#webhook-handling)
7. [Frontend Components](#frontend-components)
8. [Security Considerations](#security-considerations)
9. [Testing and Deployment](#testing-and-deployment)

## Project Setup

### Technology Stack
- Next.js
- TypeScript
- MongoDB
- Veem API

### Required Dependencies
- axios
- mongoose
- dotenv

## Environment Configuration

### Create `.env` File
```dotenv
# Veem Configuration
VEEM_API_KEY=your_veem_api_key
VEEM_ENVIRONMENT=sandbox

# MongoDB Connection
MONGODB_URI=your_mongodb_connection_string

# NextAuth Configuration
NEXTAUTH_SECRET=your_nextauth_secret
```

## User Model

### User Roles Enum
```typescript
export enum UserRole {
  ANNOTATOR = 'annotator',
  PROJECT_MANAGER = 'project_manager',
  ADMIN = 'admin'
}
```

### User Schema Interface
```typescript
interface IUser extends Document {
  // Basic Information
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;

  // Veem Integration
  veemAccountReferenceId?: string;
  isVeemAccountVerified: boolean;

  // Role-Specific Fields
  organizationName?: string;
  taxIdentificationNumber?: string;
  specialization?: string;
  
  // Bank Details
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    routingNumber: string;
    accountHolderName: string;
  };

  // Tracking
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

## Payment Model

### Payment Status Enum
```typescript
export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}
```

### Payment Schema Interface
```typescript
interface IPayment extends Document {
  veemPaymentId: string;
  fromUser: mongoose.Types.ObjectId;
  toUser: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  status: PaymentStatus;
  memo?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## Veem Integration Service

### Key Service Methods
1. Create Veem Account
2. Send Payment
3. Handle Webhook Notifications
4. Retrieve Payment History

### Example Service Implementation
```typescript
export class VeemService {
  // Create Veem account programmatically
  async createVeemAccount(user: IUser): Promise<string | null> {
    try {
      const response = await axios.post('https://sandbox-api.veem.com/veem/v1.2/accounts', {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        countryCode: 'US'
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.VEEM_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      // Update user with Veem account reference
      await User.findByIdAndUpdate(user._id, {
        veemAccountReferenceId: response.data.referenceId,
        isVeemAccountVerified: false
      });

      return response.data.referenceId;
    } catch (error) {
      console.error('Veem Account Creation Failed', error);
      return null;
    }
  }

  // Send payment from project manager to annotator
  async sendPayment(
    fromUser: IUser, 
    toUser: IUser, 
    amount: number, 
    currency: string = 'USD'
  ): Promise<string | null> {
    // Validate user roles and accounts
    // Initiate Veem payment
    // Create local payment record
  }
}
```

## Webhook Handling

### Webhook Endpoint (Next.js API Route)
```typescript
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      // Verify webhook authenticity
      await veemService.handleWebhookNotification(req.body);
      
      res.status(200).json({ message: 'Webhook processed successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error processing webhook' });
    }
  }
}
```

### Webhook Notification Handler
```typescript
async handleWebhookNotification(payload: any) {
  const { data } = payload;
  
  try {
    const payment = await Payment.findOne({ 
      veemPaymentId: data.id 
    });

    if (!payment) {
      console.error('Payment not found');
      return;
    }

    // Map Veem status to local status
    const statusMap = {
      'Sent': PaymentStatus.PROCESSING,
      'Authorized': PaymentStatus.PROCESSING,
      'Complete': PaymentStatus.COMPLETED,
      'Cancelled': PaymentStatus.CANCELLED
    };

    payment.status = statusMap[data.status] || PaymentStatus.PENDING;
    payment.updatedAt = new Date();

    await payment.save();
  } catch (error) {
    console.error('Webhook processing error', error);
  }
}
```

## Frontend Components

### Payment Initiation Component
```typescript
export const PaymentForm: React.FC<PaymentFormProps> = ({ 
  projectManagerId, 
  annotatorId 
}) => {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Fetch users and send payment
      const paymentId = await veemService.sendPayment(
        fromUser, 
        toUser, 
        parseFloat(amount)
      );

      if (paymentId) {
        alert('Payment initiated successfully');
      }
    } catch (error) {
      setError('Failed to send payment');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Enter amount"
        required
      />
      {error && <p className="text-red-500">{error}</p>}
      <button type="submit">Send Payment</button>
    </form>
  );
};
```

## Security Considerations

1. **API Security**
   - Use HTTPS for all API calls
   - Store API keys in environment variables
   - Implement webhook signature verification

2. **Authentication**
   - Secure payment endpoints
   - Implement role-based access control
   - Use multi-factor authentication

3. **Data Protection**
   - Encrypt sensitive information
   - Implement proper access controls
   - Maintain detailed audit logs

## Testing and Deployment

### Sandbox Testing
1. Test all payment scenarios in Veem sandbox
2. Verify account creation process
3. Check webhook notifications
4. Validate error handling

### Deployment Checklist
1. Switch to production Veem environment
2. Perform security audit
3. Set up monitoring and logging
4. Implement comprehensive error tracking
5. Create user-friendly error messages

## Webhook Configuration

### Register Webhook with Veem
```bash
curl -X POST https://sandbox-api.veem.com/veem/v1.2/webhooks \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "X-request-id: UNIQUE_REQUEST_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "callbackURL": "https://your-domain.com/api/veem-webhook",
    "event": "OUTBOUND_PAYMENT_STATUS_UPDATED"
  }'
```

## Troubleshooting

### Common Issues
- Webhook delivery failures
- Payment status synchronization
- Account creation errors

### Recommended Troubleshooting Steps
1. Check API key and credentials
2. Verify webhook endpoint configuration
3. Review error logs
4. Test in sandbox environment
5. Contact Veem support if persistent issues occur

## Recommended Next Steps

1. Implement comprehensive logging
2. Create payment history dashboard
3. Add advanced error handling
4. Set up real-time notifications
5. Develop detailed reporting features

## Additional Resources

- [Veem Developer Documentation](https://developer.veem.com)
- [Webhook Integration Guide](https://developer.veem.com/webhooks)
- [API Reference](https://developer.veem.com/api-reference)

---

**Note**: Always refer to the latest Veem documentation for most up-to-date implementation details.