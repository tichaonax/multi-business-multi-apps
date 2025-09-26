--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- Name: AttributeDataType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."AttributeDataType" AS ENUM (
    'TEXT',
    'NUMBER',
    'BOOLEAN',
    'DATE',
    'LIST',
    'JSON'
);


ALTER TYPE public."AttributeDataType" OWNER TO postgres;

--
-- Name: AuthorizationLevel; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."AuthorizationLevel" AS ENUM (
    'BASIC',
    'ADVANCED',
    'EMERGENCY'
);


ALTER TYPE public."AuthorizationLevel" OWNER TO postgres;

--
-- Name: CustomerType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."CustomerType" AS ENUM (
    'INDIVIDUAL',
    'BUSINESS',
    'CONTRACTOR',
    'WHOLESALE',
    'VIP'
);


ALTER TYPE public."CustomerType" OWNER TO postgres;

--
-- Name: DriveType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."DriveType" AS ENUM (
    'LEFT_HAND',
    'RIGHT_HAND'
);


ALTER TYPE public."DriveType" OWNER TO postgres;

--
-- Name: ExpenseType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ExpenseType" AS ENUM (
    'FUEL',
    'TOLL',
    'PARKING',
    'MAINTENANCE',
    'INSURANCE',
    'OTHER'
);


ALTER TYPE public."ExpenseType" OWNER TO postgres;

--
-- Name: FuelType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."FuelType" AS ENUM (
    'GASOLINE',
    'DIESEL',
    'ELECTRIC',
    'HYBRID'
);


ALTER TYPE public."FuelType" OWNER TO postgres;

--
-- Name: ImageSize; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ImageSize" AS ENUM (
    'THUMBNAIL',
    'SMALL',
    'MEDIUM',
    'LARGE',
    'ORIGINAL'
);


ALTER TYPE public."ImageSize" OWNER TO postgres;

--
-- Name: LicenseType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."LicenseType" AS ENUM (
    'REGISTRATION',
    'RADIO',
    'ROAD_USE',
    'INSURANCE',
    'INSPECTION'
);


ALTER TYPE public."LicenseType" OWNER TO postgres;

--
-- Name: OrderStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."OrderStatus" AS ENUM (
    'PENDING',
    'CONFIRMED',
    'PROCESSING',
    'READY',
    'COMPLETED',
    'CANCELLED',
    'REFUNDED'
);


ALTER TYPE public."OrderStatus" OWNER TO postgres;

--
-- Name: OrderType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."OrderType" AS ENUM (
    'SALE',
    'RETURN',
    'EXCHANGE',
    'SERVICE',
    'RENTAL',
    'SUBSCRIPTION'
);


ALTER TYPE public."OrderType" OWNER TO postgres;

--
-- Name: OwnershipType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."OwnershipType" AS ENUM (
    'PERSONAL',
    'BUSINESS'
);


ALTER TYPE public."OwnershipType" OWNER TO postgres;

--
-- Name: PaymentMethod; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PaymentMethod" AS ENUM (
    'CASH',
    'CARD',
    'MOBILE_MONEY',
    'BANK_TRANSFER',
    'STORE_CREDIT',
    'LAYAWAY',
    'NET_30',
    'CHECK'
);


ALTER TYPE public."PaymentMethod" OWNER TO postgres;

--
-- Name: PaymentStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PaymentStatus" AS ENUM (
    'PENDING',
    'PAID',
    'PARTIALLY_PAID',
    'OVERDUE',
    'REFUNDED',
    'FAILED'
);


ALTER TYPE public."PaymentStatus" OWNER TO postgres;

--
-- Name: ProductCondition; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ProductCondition" AS ENUM (
    'NEW',
    'USED',
    'REFURBISHED',
    'DAMAGED',
    'EXPIRED'
);


ALTER TYPE public."ProductCondition" OWNER TO postgres;

--
-- Name: ProductType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ProductType" AS ENUM (
    'PHYSICAL',
    'DIGITAL',
    'SERVICE',
    'COMBO'
);


ALTER TYPE public."ProductType" OWNER TO postgres;

--
-- Name: PromotionType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PromotionType" AS ENUM (
    'PERCENTAGE',
    'FIXED_AMOUNT',
    'BUY_ONE_GET_ONE',
    'COMBO_DEAL',
    'HAPPY_HOUR',
    'CATEGORY_DISCOUNT'
);


ALTER TYPE public."PromotionType" OWNER TO postgres;

--
-- Name: ReimbursementStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ReimbursementStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'PAID',
    'REJECTED'
);


ALTER TYPE public."ReimbursementStatus" OWNER TO postgres;

--
-- Name: ServiceType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ServiceType" AS ENUM (
    'OIL_CHANGE',
    'TIRE_REPLACEMENT',
    'BRAKE_SERVICE',
    'INSPECTION',
    'REPAIR',
    'OTHER'
);


ALTER TYPE public."ServiceType" OWNER TO postgres;

--
-- Name: StockMovementType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."StockMovementType" AS ENUM (
    'PURCHASE_RECEIVED',
    'SALE',
    'RETURN_IN',
    'RETURN_OUT',
    'ADJUSTMENT',
    'TRANSFER_IN',
    'TRANSFER_OUT',
    'DAMAGE',
    'THEFT',
    'EXPIRED',
    'PRODUCTION_IN',
    'PRODUCTION_OUT'
);


ALTER TYPE public."StockMovementType" OWNER TO postgres;

--
-- Name: TripType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TripType" AS ENUM (
    'BUSINESS',
    'PERSONAL',
    'MIXED'
);


ALTER TYPE public."TripType" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.accounts (
    id text NOT NULL,
    "userId" text NOT NULL,
    type text NOT NULL,
    provider text NOT NULL,
    "providerAccountId" text NOT NULL,
    "refreshToken" text,
    "accessToken" text,
    "expiresAt" integer,
    "tokenType" text,
    scope text,
    "idToken" text,
    "sessionState" text
);


ALTER TABLE public.accounts OWNER TO postgres;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id text NOT NULL,
    "userId" text NOT NULL,
    action text NOT NULL,
    "entityType" text NOT NULL,
    "entityId" text NOT NULL,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "oldValues" jsonb,
    "newValues" jsonb,
    metadata jsonb,
    "tableName" text,
    "recordId" text,
    changes jsonb,
    details jsonb
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: benefit_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.benefit_types (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    type text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "defaultAmount" numeric(12,2),
    "isActive" boolean DEFAULT true NOT NULL,
    "isPercentage" boolean DEFAULT false NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.benefit_types OWNER TO postgres;

--
-- Name: business_brands; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.business_brands (
    id text NOT NULL,
    "businessId" text NOT NULL,
    name text NOT NULL,
    description text,
    "logoUrl" text,
    website text,
    "isActive" boolean DEFAULT true NOT NULL,
    "businessType" text NOT NULL,
    attributes jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.business_brands OWNER TO postgres;

--
-- Name: business_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.business_categories (
    id text NOT NULL,
    "businessId" text NOT NULL,
    name text NOT NULL,
    description text,
    "parentId" text,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "businessType" text NOT NULL,
    attributes jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.business_categories OWNER TO postgres;

--
-- Name: business_customers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.business_customers (
    id text NOT NULL,
    "businessId" text NOT NULL,
    "customerNumber" text NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    "dateOfBirth" timestamp(3) without time zone,
    address text,
    city text,
    country text,
    "customerType" public."CustomerType" DEFAULT 'INDIVIDUAL'::public."CustomerType" NOT NULL,
    segment text,
    "loyaltyPoints" integer DEFAULT 0 NOT NULL,
    "totalSpent" numeric(12,2) DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "businessType" text NOT NULL,
    attributes jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.business_customers OWNER TO postgres;

--
-- Name: business_memberships; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.business_memberships (
    id text NOT NULL,
    "userId" text NOT NULL,
    "businessId" text NOT NULL,
    role text DEFAULT 'employee'::text NOT NULL,
    permissions jsonb DEFAULT '{}'::jsonb NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "invitedBy" text,
    "joinedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastAccessedAt" timestamp(3) without time zone,
    "templateId" text
);


ALTER TABLE public.business_memberships OWNER TO postgres;

--
-- Name: business_order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.business_order_items (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "productVariantId" text NOT NULL,
    quantity integer NOT NULL,
    "unitPrice" numeric(10,2) NOT NULL,
    "discountAmount" numeric(10,2) DEFAULT 0 NOT NULL,
    "totalPrice" numeric(10,2) NOT NULL,
    attributes jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.business_order_items OWNER TO postgres;

--
-- Name: business_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.business_orders (
    id text NOT NULL,
    "businessId" text NOT NULL,
    "orderNumber" text NOT NULL,
    "customerId" text,
    "employeeId" text,
    "orderType" public."OrderType" DEFAULT 'SALE'::public."OrderType" NOT NULL,
    status public."OrderStatus" DEFAULT 'PENDING'::public."OrderStatus" NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    "taxAmount" numeric(10,2) NOT NULL,
    "discountAmount" numeric(10,2) DEFAULT 0 NOT NULL,
    "totalAmount" numeric(10,2) NOT NULL,
    "paymentMethod" public."PaymentMethod",
    "paymentStatus" public."PaymentStatus" DEFAULT 'PENDING'::public."PaymentStatus" NOT NULL,
    "businessType" text NOT NULL,
    attributes jsonb,
    notes text,
    "processedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.business_orders OWNER TO postgres;

--
-- Name: business_products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.business_products (
    id text NOT NULL,
    "businessId" text NOT NULL,
    name text NOT NULL,
    description text,
    sku text,
    barcode text,
    "brandId" text,
    "categoryId" text NOT NULL,
    "productType" public."ProductType" DEFAULT 'PHYSICAL'::public."ProductType" NOT NULL,
    condition public."ProductCondition" DEFAULT 'NEW'::public."ProductCondition" NOT NULL,
    "basePrice" numeric(10,2) NOT NULL,
    "costPrice" numeric(10,2),
    "isActive" boolean DEFAULT true NOT NULL,
    "businessType" text NOT NULL,
    attributes jsonb,
    "isAvailable" boolean DEFAULT true NOT NULL,
    "spiceLevel" integer DEFAULT 0,
    "dietaryRestrictions" text[],
    allergens text[],
    "preparationTime" integer DEFAULT 0,
    calories integer,
    "isCombo" boolean DEFAULT false NOT NULL,
    "comboItemsData" jsonb,
    "originalPrice" numeric(10,2),
    "discountPercent" numeric(5,2),
    "discountAmount" numeric(10,2),
    "promotionStartDate" timestamp(3) without time zone,
    "promotionEndDate" timestamp(3) without time zone,
    "promotionName" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.business_products OWNER TO postgres;

--
-- Name: business_stock_movements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.business_stock_movements (
    id text NOT NULL,
    "businessId" text NOT NULL,
    "productVariantId" text NOT NULL,
    "movementType" public."StockMovementType" NOT NULL,
    quantity integer NOT NULL,
    "unitCost" numeric(10,2),
    reference text,
    reason text,
    "employeeId" text,
    "businessType" text NOT NULL,
    attributes jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "businessProductId" text
);


ALTER TABLE public.business_stock_movements OWNER TO postgres;

--
-- Name: business_suppliers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.business_suppliers (
    id text NOT NULL,
    "businessId" text NOT NULL,
    "supplierNumber" text NOT NULL,
    name text NOT NULL,
    "contactPerson" text,
    email text,
    phone text,
    address text,
    "paymentTerms" text,
    "creditLimit" numeric(12,2),
    "isActive" boolean DEFAULT true NOT NULL,
    "businessType" text NOT NULL,
    attributes jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.business_suppliers OWNER TO postgres;

--
-- Name: businesses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.businesses (
    id text NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    description text,
    "isActive" boolean DEFAULT true NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    "createdBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "umbrellaBusinessId" text,
    "isUmbrellaBusiness" boolean DEFAULT false NOT NULL,
    "umbrellaBusinessName" text DEFAULT 'Hwanda Enterprises LLC'::text,
    "umbrellaBusinessAddress" text,
    "umbrellaBusinessEmail" text,
    "umbrellaBusinessPhone" text,
    "umbrellaBusinessRegistration" text
);


ALTER TABLE public.businesses OWNER TO postgres;

--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_messages (
    id text NOT NULL,
    message text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "roomId" text,
    "userId" text
);


ALTER TABLE public.chat_messages OWNER TO postgres;

--
-- Name: chat_participants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_participants (
    id text NOT NULL,
    "joinedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "roomId" text,
    "userId" text
);


ALTER TABLE public.chat_participants OWNER TO postgres;

--
-- Name: chat_rooms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_rooms (
    id text NOT NULL,
    name text NOT NULL,
    type text DEFAULT 'group'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdBy" text
);


ALTER TABLE public.chat_rooms OWNER TO postgres;

--
-- Name: compensation_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.compensation_types (
    id text NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    description text,
    "baseAmount" numeric(12,2),
    "commissionPercentage" numeric(5,2),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    frequency text DEFAULT 'monthly'::text
);


ALTER TABLE public.compensation_types OWNER TO postgres;

--
-- Name: construction_expenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.construction_expenses (
    id text NOT NULL,
    category text NOT NULL,
    description text NOT NULL,
    amount numeric(12,2) NOT NULL,
    vendor text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdBy" text,
    "projectId" text,
    "receiptUrl" text
);


ALTER TABLE public.construction_expenses OWNER TO postgres;

--
-- Name: construction_projects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.construction_projects (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    status text DEFAULT 'active'::text NOT NULL,
    budget numeric(12,2),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdBy" text,
    "endDate" timestamp(3) without time zone,
    "startDate" timestamp(3) without time zone,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.construction_projects OWNER TO postgres;

--
-- Name: contract_benefits; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contract_benefits (
    id text NOT NULL,
    amount numeric(12,2) NOT NULL,
    notes text,
    "benefitTypeId" text NOT NULL,
    "contractId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "isPercentage" boolean DEFAULT false NOT NULL
);


ALTER TABLE public.contract_benefits OWNER TO postgres;

--
-- Name: contract_renewals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contract_renewals (
    id text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    "autoRenewalMonths" integer,
    "benefitChanges" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "employeeId" text NOT NULL,
    "isAutoRenewal" boolean DEFAULT false NOT NULL,
    "jobTitleChange" text,
    "managerNotifiedAt" timestamp(3) without time zone,
    "newContractId" text,
    "originalContractId" text NOT NULL,
    "processedAt" timestamp(3) without time zone,
    "processedBy" text,
    "reminderSentAt" timestamp(3) without time zone,
    "renewalDueDate" timestamp(3) without time zone NOT NULL,
    "salaryChange" numeric(12,2),
    "salaryChangeType" text,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.contract_renewals OWNER TO postgres;

--
-- Name: disciplinary_actions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.disciplinary_actions (
    id text NOT NULL,
    "employeeId" text NOT NULL,
    "actionType" text NOT NULL,
    "violationType" text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    "incidentDate" timestamp(3) without time zone NOT NULL,
    "actionDate" timestamp(3) without time zone NOT NULL,
    severity text DEFAULT 'low'::text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "improvementPlan" text,
    "followUpDate" timestamp(3) without time zone,
    "followUpNotes" text,
    "createdBy" text NOT NULL,
    "hrReviewed" boolean DEFAULT false NOT NULL,
    "hrReviewedBy" text,
    "hrReviewedAt" timestamp(3) without time zone,
    "hrNotes" text,
    "employeeAcknowledged" boolean DEFAULT false NOT NULL,
    "employeeResponse" text,
    "employeeSignedAt" timestamp(3) without time zone,
    attachments text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.disciplinary_actions OWNER TO postgres;

--
-- Name: driver_authorizations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.driver_authorizations (
    id text NOT NULL,
    "driverId" text NOT NULL,
    "vehicleId" text NOT NULL,
    "authorizedBy" text NOT NULL,
    "authorizedDate" timestamp(3) without time zone NOT NULL,
    "expiryDate" timestamp(3) without time zone,
    "isActive" boolean DEFAULT true NOT NULL,
    "authorizationLevel" public."AuthorizationLevel" DEFAULT 'BASIC'::public."AuthorizationLevel" NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.driver_authorizations OWNER TO postgres;

--
-- Name: driver_license_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.driver_license_templates (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    pattern text NOT NULL,
    example text NOT NULL,
    "countryCode" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.driver_license_templates OWNER TO postgres;

--
-- Name: employee_allowances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employee_allowances (
    id text NOT NULL,
    "employeeId" text NOT NULL,
    type text NOT NULL,
    amount numeric(12,2) NOT NULL,
    description text,
    "payrollMonth" integer NOT NULL,
    "payrollYear" integer NOT NULL,
    "approvedBy" text,
    "approvedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.employee_allowances OWNER TO postgres;

--
-- Name: employee_attendance; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employee_attendance (
    id text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    status text DEFAULT 'present'::text NOT NULL,
    notes text,
    "checkIn" timestamp(3) without time zone,
    "checkOut" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "employeeId" text NOT NULL,
    "hoursWorked" numeric(4,2)
);


ALTER TABLE public.employee_attendance OWNER TO postgres;

--
-- Name: employee_benefits; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employee_benefits (
    id text NOT NULL,
    amount numeric(12,2) NOT NULL,
    notes text,
    "benefitTypeId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "effectiveDate" timestamp(3) without time zone NOT NULL,
    "employeeId" text NOT NULL,
    "endDate" timestamp(3) without time zone,
    "isActive" boolean DEFAULT true NOT NULL,
    "isPercentage" boolean DEFAULT false NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.employee_benefits OWNER TO postgres;

--
-- Name: employee_bonuses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employee_bonuses (
    id text NOT NULL,
    amount numeric(12,2) NOT NULL,
    "approvedAt" timestamp(3) without time zone,
    "approvedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "employeeId" text NOT NULL,
    reason text,
    type text NOT NULL
);


ALTER TABLE public.employee_bonuses OWNER TO postgres;

--
-- Name: employee_business_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employee_business_assignments (
    id text NOT NULL,
    role text,
    notes text,
    "assignedBy" text,
    "businessId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "employeeId" text NOT NULL,
    "endDate" timestamp(3) without time zone,
    "isActive" boolean DEFAULT true NOT NULL,
    "isPrimary" boolean DEFAULT false NOT NULL,
    "startDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.employee_business_assignments OWNER TO postgres;

--
-- Name: employee_contracts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employee_contracts (
    id text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    notes text,
    "additionalBusinesses" text[],
    "approvedAt" timestamp(3) without time zone,
    "approvedBy" text,
    "baseSalary" numeric(12,2) NOT NULL,
    "compensationTypeId" text NOT NULL,
    "contractNumber" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdBy" text,
    "customResponsibilities" text,
    "employeeId" text NOT NULL,
    "employeeSignedAt" timestamp(3) without time zone,
    "endDate" timestamp(3) without time zone,
    "isCommissionBased" boolean DEFAULT false NOT NULL,
    "isSalaryBased" boolean DEFAULT true NOT NULL,
    "jobTitleId" text NOT NULL,
    "managerSignedAt" timestamp(3) without time zone,
    "pdfUrl" text,
    "primaryBusinessId" text NOT NULL,
    "probationPeriodMonths" integer,
    "signedPdfUrl" text,
    "startDate" timestamp(3) without time zone NOT NULL,
    "supervisorId" text,
    "supervisorName" text,
    "supervisorTitle" text,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "commissionAmount" numeric(12,2),
    "contractDurationMonths" integer,
    "livingAllowance" numeric(12,2),
    "pdfGenerationData" jsonb,
    "umbrellaBusinessId" text,
    "umbrellaBusinessName" text DEFAULT 'Hwanda Enterprises LLC'::text,
    "businessAssignments" jsonb
);


ALTER TABLE public.employee_contracts OWNER TO postgres;

--
-- Name: employee_deduction_payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employee_deduction_payments (
    id text NOT NULL,
    amount numeric(12,2) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deductionId" text NOT NULL,
    "paymentDate" timestamp(3) without time zone NOT NULL,
    "processedBy" text
);


ALTER TABLE public.employee_deduction_payments OWNER TO postgres;

--
-- Name: employee_deductions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employee_deductions (
    id text NOT NULL,
    amount numeric(12,2) NOT NULL,
    "approvedAt" timestamp(3) without time zone,
    "approvedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "employeeId" text NOT NULL,
    reason text,
    type text NOT NULL
);


ALTER TABLE public.employee_deductions OWNER TO postgres;

--
-- Name: employee_leave_balance; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employee_leave_balance (
    id text NOT NULL,
    year integer NOT NULL,
    "annualLeaveDays" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "employeeId" text NOT NULL,
    "remainingAnnual" integer DEFAULT 0 NOT NULL,
    "remainingSick" integer DEFAULT 0 NOT NULL,
    "sickLeaveDays" integer DEFAULT 0 NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "usedAnnualDays" integer DEFAULT 0 NOT NULL,
    "usedSickDays" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.employee_leave_balance OWNER TO postgres;

--
-- Name: employee_leave_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employee_leave_requests (
    id text NOT NULL,
    reason text,
    status text DEFAULT 'pending'::text NOT NULL,
    "approvedAt" timestamp(3) without time zone,
    "approvedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "daysRequested" integer NOT NULL,
    "employeeId" text NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    "leaveType" text NOT NULL,
    "rejectionReason" text,
    "startDate" timestamp(3) without time zone NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.employee_leave_requests OWNER TO postgres;

--
-- Name: employee_loan_payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employee_loan_payments (
    id text NOT NULL,
    amount numeric(12,2) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "loanId" text NOT NULL,
    "paymentDate" timestamp(3) without time zone NOT NULL,
    "processedBy" text
);


ALTER TABLE public.employee_loan_payments OWNER TO postgres;

--
-- Name: employee_loans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employee_loans (
    id text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    "approvedAt" timestamp(3) without time zone,
    "approvedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "employeeId" text NOT NULL,
    "loanAmount" numeric(12,2) NOT NULL,
    "monthlyDeduction" numeric(12,2) NOT NULL,
    "remainingBalance" numeric(12,2) NOT NULL,
    "remainingMonths" integer NOT NULL,
    "totalMonths" integer NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.employee_loans OWNER TO postgres;

--
-- Name: employee_salary_increases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employee_salary_increases (
    id text NOT NULL,
    reason text,
    "approvedAt" timestamp(3) without time zone,
    "approvedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "effectiveDate" timestamp(3) without time zone NOT NULL,
    "employeeId" text NOT NULL,
    "increaseAmount" numeric(12,2) NOT NULL,
    "increasePercent" numeric(5,2) NOT NULL,
    "newSalary" numeric(12,2) NOT NULL,
    "previousSalary" numeric(12,2) NOT NULL
);


ALTER TABLE public.employee_salary_increases OWNER TO postgres;

--
-- Name: employee_time_tracking; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employee_time_tracking (
    id text NOT NULL,
    "employeeId" text NOT NULL,
    year integer NOT NULL,
    month integer NOT NULL,
    "workDays" integer DEFAULT 0 NOT NULL,
    "totalHours" numeric(5,2),
    "overtimeHours" numeric(5,2),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.employee_time_tracking OWNER TO postgres;

--
-- Name: employees; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employees (
    id text NOT NULL,
    email text,
    phone text NOT NULL,
    address text,
    "employmentStatus" text DEFAULT 'active'::text NOT NULL,
    notes text,
    "compensationTypeId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdBy" text,
    "customResponsibilities" text,
    "dateOfBirth" timestamp(3) without time zone,
    "employeeNumber" text NOT NULL,
    "firstName" text NOT NULL,
    "fullName" text NOT NULL,
    "hireDate" timestamp(3) without time zone NOT NULL,
    "idFormatTemplateId" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "jobTitleId" text NOT NULL,
    "lastName" text NOT NULL,
    "nationalId" text NOT NULL,
    "primaryBusinessId" text NOT NULL,
    "profilePhotoUrl" text,
    "startDate" timestamp(3) without time zone,
    "supervisorId" text,
    "terminationDate" timestamp(3) without time zone,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "userId" text,
    "driverLicenseNumber" text,
    "driverLicenseTemplateId" text
);


ALTER TABLE public.employees OWNER TO postgres;

--
-- Name: expense_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expense_categories (
    id text NOT NULL,
    name text NOT NULL,
    emoji text DEFAULT '💰'::text,
    color text DEFAULT '#3B82F6'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "userId" text
);


ALTER TABLE public.expense_categories OWNER TO postgres;

--
-- Name: fund_sources; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fund_sources (
    id text NOT NULL,
    name text NOT NULL,
    emoji text DEFAULT '💰'::text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "usageCount" integer DEFAULT 0 NOT NULL,
    "userId" text
);


ALTER TABLE public.fund_sources OWNER TO postgres;

--
-- Name: id_format_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.id_format_templates (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    pattern text NOT NULL,
    example text NOT NULL,
    "countryCode" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.id_format_templates OWNER TO postgres;

--
-- Name: inter_business_loans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inter_business_loans (
    id text NOT NULL,
    "loanNumber" text NOT NULL,
    "principalAmount" numeric(12,2) NOT NULL,
    "interestRate" numeric(5,2) DEFAULT 0 NOT NULL,
    "totalAmount" numeric(12,2) NOT NULL,
    "remainingBalance" numeric(12,2) NOT NULL,
    "lenderType" text NOT NULL,
    "lenderUserId" text,
    "lenderBusinessId" text,
    "borrowerBusinessId" text,
    "loanDate" timestamp(3) without time zone NOT NULL,
    "dueDate" timestamp(3) without time zone,
    status text DEFAULT 'active'::text NOT NULL,
    terms text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text NOT NULL,
    "borrowerPersonId" text,
    "borrowerType" text NOT NULL
);


ALTER TABLE public.inter_business_loans OWNER TO postgres;

--
-- Name: job_titles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.job_titles (
    id text NOT NULL,
    title text NOT NULL,
    description text,
    responsibilities text[],
    department text,
    level text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.job_titles OWNER TO postgres;

--
-- Name: loan_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.loan_transactions (
    id text NOT NULL,
    "loanId" text NOT NULL,
    "transactionType" text NOT NULL,
    amount numeric(12,2) NOT NULL,
    description text,
    "transactionDate" timestamp(3) without time zone NOT NULL,
    "personalExpenseId" text,
    "businessTransactionId" text,
    "isAutoGenerated" boolean DEFAULT false NOT NULL,
    "autoGeneratedNote" text,
    "initiatedFrom" text,
    "balanceAfter" numeric(12,2) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdBy" text NOT NULL
);


ALTER TABLE public.loan_transactions OWNER TO postgres;

--
-- Name: menu_combo_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.menu_combo_items (
    id text NOT NULL,
    "comboId" text NOT NULL,
    "productId" text NOT NULL,
    "variantId" text,
    quantity integer DEFAULT 1 NOT NULL,
    "isRequired" boolean DEFAULT true NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.menu_combo_items OWNER TO postgres;

--
-- Name: menu_combos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.menu_combos (
    id text NOT NULL,
    "businessId" text NOT NULL,
    name text NOT NULL,
    description text,
    "totalPrice" numeric(10,2) NOT NULL,
    "originalTotalPrice" numeric(10,2),
    "isActive" boolean DEFAULT true NOT NULL,
    "isAvailable" boolean DEFAULT true NOT NULL,
    "imageUrl" text,
    "preparationTime" integer DEFAULT 0 NOT NULL,
    "discountPercent" numeric(5,2),
    "promotionStartDate" timestamp(3) without time zone,
    "promotionEndDate" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.menu_combos OWNER TO postgres;

--
-- Name: menu_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.menu_items (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    category text NOT NULL,
    barcode text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "isAvailable" boolean DEFAULT true NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.menu_items OWNER TO postgres;

--
-- Name: menu_promotions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.menu_promotions (
    id text NOT NULL,
    "businessId" text NOT NULL,
    name text NOT NULL,
    description text,
    type public."PromotionType" NOT NULL,
    value numeric(10,2) NOT NULL,
    "minOrderAmount" numeric(10,2),
    "maxDiscountAmount" numeric(10,2),
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone,
    "startTime" text,
    "endTime" text,
    "daysOfWeek" text[],
    "isActive" boolean DEFAULT true NOT NULL,
    "usageLimit" integer,
    "usageCount" integer DEFAULT 0 NOT NULL,
    "applicableCategories" text[],
    "applicableProducts" text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.menu_promotions OWNER TO postgres;

--
-- Name: order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_items (
    id text NOT NULL,
    quantity integer NOT NULL,
    price numeric(10,2) NOT NULL,
    notes text,
    "menuItemId" text,
    "orderId" text
);


ALTER TABLE public.order_items OWNER TO postgres;

--
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id text NOT NULL,
    total numeric(10,2) NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdBy" text,
    "orderNumber" text NOT NULL,
    "tableNumber" text
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- Name: permission_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permission_templates (
    id text NOT NULL,
    name text NOT NULL,
    permissions jsonb DEFAULT '{}'::jsonb NOT NULL,
    "businessType" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdBy" text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.permission_templates OWNER TO postgres;

--
-- Name: personal_budgets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.personal_budgets (
    id text NOT NULL,
    amount numeric(12,2) NOT NULL,
    description text,
    type text DEFAULT 'deposit'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "userId" text
);


ALTER TABLE public.personal_budgets OWNER TO postgres;

--
-- Name: personal_expenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.personal_expenses (
    id text NOT NULL,
    category text NOT NULL,
    description text NOT NULL,
    amount numeric(12,2) NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    tags text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "receiptUrl" text,
    "userId" text
);


ALTER TABLE public.personal_expenses OWNER TO postgres;

--
-- Name: persons; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.persons (
    id text NOT NULL,
    email text,
    phone text NOT NULL,
    address text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdBy" text,
    "fullName" text NOT NULL,
    "idFormatTemplateId" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "nationalId" text NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "driverLicenseNumber" text,
    "driverLicenseTemplateId" text
);


ALTER TABLE public.persons OWNER TO postgres;

--
-- Name: product_attributes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_attributes (
    id text NOT NULL,
    "productId" text NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    "dataType" public."AttributeDataType" DEFAULT 'TEXT'::public."AttributeDataType" NOT NULL,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.product_attributes OWNER TO postgres;

--
-- Name: product_images; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_images (
    id text NOT NULL,
    "productId" text NOT NULL,
    "imageUrl" text NOT NULL,
    "altText" text,
    "isPrimary" boolean DEFAULT false NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "imageSize" public."ImageSize" DEFAULT 'MEDIUM'::public."ImageSize" NOT NULL,
    "businessType" text NOT NULL,
    attributes jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.product_images OWNER TO postgres;

--
-- Name: product_variants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_variants (
    id text NOT NULL,
    "productId" text NOT NULL,
    name text,
    sku text NOT NULL,
    barcode text,
    price numeric(10,2),
    "stockQuantity" integer DEFAULT 0 NOT NULL,
    "reorderLevel" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    attributes jsonb,
    "isAvailable" boolean DEFAULT true NOT NULL,
    "originalPrice" numeric(10,2),
    "discountPercent" numeric(5,2),
    "discountAmount" numeric(10,2),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.product_variants OWNER TO postgres;

--
-- Name: project_contractors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_contractors (
    id text NOT NULL,
    role text,
    status text DEFAULT 'active'::text NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "endDate" timestamp(3) without time zone,
    "hourlyRate" numeric(12,2),
    "isPrimary" boolean DEFAULT false NOT NULL,
    "personId" text NOT NULL,
    "projectId" text NOT NULL,
    "startDate" timestamp(3) without time zone,
    "totalContractAmount" numeric(12,2),
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.project_contractors OWNER TO postgres;

--
-- Name: project_stages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_stages (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    "completionDate" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "endDate" timestamp(3) without time zone,
    "estimatedAmount" numeric(12,2),
    "orderIndex" integer DEFAULT 0 NOT NULL,
    "projectId" text NOT NULL,
    "startDate" timestamp(3) without time zone,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.project_stages OWNER TO postgres;

--
-- Name: project_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_transactions (
    id text NOT NULL,
    amount numeric(12,2) NOT NULL,
    description text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    "approvedAt" timestamp(3) without time zone,
    "approvedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdBy" text,
    "paidAt" timestamp(3) without time zone,
    "paymentCategory" text,
    "paymentMethod" text,
    "personalExpenseId" text NOT NULL,
    "projectContractorId" text,
    "projectId" text NOT NULL,
    "receiptUrl" text,
    "recipientPersonId" text,
    "referenceNumber" text,
    "stageAssignmentId" text,
    "stageId" text,
    "transactionType" text NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.project_transactions OWNER TO postgres;

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sessions (
    id text NOT NULL,
    "sessionToken" text NOT NULL,
    "userId" text NOT NULL,
    expires timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.sessions OWNER TO postgres;

--
-- Name: stage_contractor_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stage_contractor_assignments (
    id text NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "depositAmount" numeric(12,2),
    "depositPaidDate" timestamp(3) without time zone,
    "depositPercentage" numeric(5,2) DEFAULT 0.00 NOT NULL,
    "finalPaymentDate" timestamp(3) without time zone,
    "isDepositPaid" boolean DEFAULT false NOT NULL,
    "isFinalPaymentMade" boolean DEFAULT false NOT NULL,
    "predeterminedAmount" numeric(12,2) NOT NULL,
    "projectContractorId" text NOT NULL,
    "stageId" text NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.stage_contractor_assignments OWNER TO postgres;

--
-- Name: supplier_products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.supplier_products (
    id text NOT NULL,
    "supplierId" text NOT NULL,
    "productId" text NOT NULL,
    "supplierSku" text,
    "supplierPrice" numeric(10,2) NOT NULL,
    "minimumOrder" integer DEFAULT 1 NOT NULL,
    "leadTimeDays" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    attributes jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.supplier_products OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    "passwordHash" text NOT NULL,
    name text NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    permissions jsonb DEFAULT '{}'::jsonb NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "passwordResetRequired" boolean DEFAULT false NOT NULL,
    "deactivatedAt" timestamp(3) without time zone,
    "deactivatedBy" text,
    "deactivationReason" text,
    "deactivationNotes" text,
    "reactivatedAt" timestamp(3) without time zone,
    "reactivatedBy" text,
    "reactivationNotes" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: vehicle_drivers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vehicle_drivers (
    id text NOT NULL,
    "fullName" text NOT NULL,
    "licenseNumber" text NOT NULL,
    "licenseExpiry" timestamp(3) without time zone NOT NULL,
    "phoneNumber" text,
    "emailAddress" text,
    "emergencyContact" text,
    "emergencyPhone" text,
    "userId" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "dateOfBirth" timestamp(3) without time zone,
    address text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.vehicle_drivers OWNER TO postgres;

--
-- Name: vehicle_expenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vehicle_expenses (
    id text NOT NULL,
    "vehicleId" text NOT NULL,
    "tripId" text,
    "businessId" text,
    "expenseType" public."ExpenseType" NOT NULL,
    "expenseCategory" text,
    amount numeric(10,2) NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    "expenseDate" timestamp(3) without time zone NOT NULL,
    "isBusinessDeductible" boolean DEFAULT false NOT NULL,
    "receiptUrl" text,
    "vendorName" text,
    description text,
    "mileageAtExpense" integer,
    "fuelQuantity" numeric(8,2),
    "fuelType" public."FuelType",
    "createdBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.vehicle_expenses OWNER TO postgres;

--
-- Name: vehicle_licenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vehicle_licenses (
    id text NOT NULL,
    "vehicleId" text NOT NULL,
    "licenseType" public."LicenseType" NOT NULL,
    "licenseNumber" text NOT NULL,
    "issuingAuthority" text,
    "issueDate" timestamp(3) without time zone NOT NULL,
    "expiryDate" timestamp(3) without time zone NOT NULL,
    "renewalCost" numeric(10,2),
    "isActive" boolean DEFAULT true NOT NULL,
    "documentUrl" text,
    "reminderDays" integer DEFAULT 30 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.vehicle_licenses OWNER TO postgres;

--
-- Name: vehicle_maintenance_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vehicle_maintenance_records (
    id text NOT NULL,
    "vehicleId" text NOT NULL,
    "serviceType" public."ServiceType" NOT NULL,
    "serviceCategory" text,
    "serviceName" text NOT NULL,
    "serviceDate" timestamp(3) without time zone NOT NULL,
    "mileageAtService" integer NOT NULL,
    "nextServiceDue" timestamp(3) without time zone,
    "nextServiceMileage" integer,
    "serviceCost" numeric(10,2) NOT NULL,
    "serviceProvider" text,
    "serviceLocation" text,
    "partsReplaced" jsonb,
    "warrantyInfo" text,
    "receiptUrl" text,
    notes text,
    "isScheduledService" boolean DEFAULT false NOT NULL,
    "createdBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.vehicle_maintenance_records OWNER TO postgres;

--
-- Name: vehicle_reimbursements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vehicle_reimbursements (
    id text NOT NULL,
    "userId" text NOT NULL,
    "vehicleId" text NOT NULL,
    "businessId" text NOT NULL,
    "reimbursementPeriod" text NOT NULL,
    "totalMileage" integer NOT NULL,
    "businessMileage" integer NOT NULL,
    "personalMileage" integer NOT NULL,
    "statutoryRate" numeric(8,4) NOT NULL,
    "totalAmount" numeric(10,2) NOT NULL,
    status public."ReimbursementStatus" DEFAULT 'PENDING'::public."ReimbursementStatus" NOT NULL,
    "submissionDate" timestamp(3) without time zone NOT NULL,
    "approvalDate" timestamp(3) without time zone,
    "paymentDate" timestamp(3) without time zone,
    "approvedBy" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.vehicle_reimbursements OWNER TO postgres;

--
-- Name: vehicle_trips; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vehicle_trips (
    id text NOT NULL,
    "vehicleId" text NOT NULL,
    "driverId" text NOT NULL,
    "businessId" text,
    "startMileage" integer NOT NULL,
    "endMileage" integer,
    "tripMileage" integer DEFAULT 0 NOT NULL,
    "tripPurpose" text NOT NULL,
    "tripType" public."TripType" NOT NULL,
    "startLocation" text,
    "endLocation" text,
    "startTime" timestamp(3) without time zone NOT NULL,
    "endTime" timestamp(3) without time zone,
    "isCompleted" boolean DEFAULT false NOT NULL,
    notes text,
    "gpsTrackingData" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.vehicle_trips OWNER TO postgres;

--
-- Name: vehicles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vehicles (
    id text NOT NULL,
    "licensePlate" text NOT NULL,
    vin text NOT NULL,
    make text NOT NULL,
    model text NOT NULL,
    year integer NOT NULL,
    color text,
    weight numeric(10,2),
    "driveType" public."DriveType" NOT NULL,
    "ownershipType" public."OwnershipType" NOT NULL,
    "currentMileage" integer NOT NULL,
    "businessId" text,
    "userId" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "purchaseDate" timestamp(3) without time zone,
    "purchasePrice" numeric(12,2),
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.vehicles OWNER TO postgres;

--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
509497bf-825f-4309-81ac-cdd437707f6c	5e9a51ca25ccd571888e5c9aec863240dffabfc7b8854abc5056b4c8fd188716	2025-09-14 14:11:52.66759-05	20250913182932_add_umbrella_business_support	\N	\N	2025-09-14 14:11:52.510155-05	1
74d17b3e-281b-4c12-b8af-388ce35c00b5	d3e99572e901569556d19249f8db28b491ca8515541ad7cb9ce5f3ca7394b1c4	2025-09-14 14:11:52.670119-05	20250913184307_add_umbrella_business_details	\N	\N	2025-09-14 14:11:52.668019-05	1
22234bda-b245-476a-8ddc-b68f1ac544b7	c3377bc8f4e55dc6ff1fa2714b2f74141fd252d5b8fa463fb32533cc0c87d9ba	2025-09-14 14:11:52.672521-05	20250913185050_add_phone_format_preference	\N	\N	2025-09-14 14:11:52.67041-05	1
e6eb3233-6def-4047-a6ca-36d8b1e76194	aa7e3f5cd7c47ed615ca362cb4ae55ef80fd527da4fa47a95e5188cbcfcab063	\N	add_restaurant_menu_features	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: add_restaurant_menu_features\n\nDatabase error code: 42P01\n\nDatabase error:\nERROR: relation "business_products" does not exist\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E42P01), message: "relation \\"business_products\\" does not exist", detail: None, hint: None, position: None, where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("namespace.c"), line: Some(639), routine: Some("RangeVarGetRelidExtended") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="add_restaurant_menu_features"\n             at schema-engine\\connectors\\sql-schema-connector\\src\\apply_migration.rs:113\n   1: schema_commands::commands::apply_migrations::Applying migration\n           with migration_name="add_restaurant_menu_features"\n             at schema-engine\\commands\\src\\commands\\apply_migrations.rs:95\n   2: schema_core::state::ApplyMigrations\n             at schema-engine\\core\\src\\state.rs:236	2025-09-14 14:12:10.756502-05	2025-09-14 14:11:52.672829-05	0
c11ea704-7ea1-403e-bb14-a5c48b871aef	aa7e3f5cd7c47ed615ca362cb4ae55ef80fd527da4fa47a95e5188cbcfcab063	2025-09-14 14:12:10.758307-05	add_restaurant_menu_features		\N	2025-09-14 14:12:10.758307-05	0
\.


--
-- Data for Name: accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.accounts (id, "userId", type, provider, "providerAccountId", "refreshToken", "accessToken", "expiresAt", "tokenType", scope, "idToken", "sessionState") FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, "userId", action, "entityType", "entityId", "timestamp", "oldValues", "newValues", metadata, "tableName", "recordId", changes, details) FROM stdin;
cmfm8t29700021p8831rlxd78	d0e54210-5d9f-4e70-a138-5e1957cfdab4	DATA_IMPORT	ReferenceData	reference-data-seed-failed-1758008393896	2025-09-16 07:39:53.896	null	{"error": "Command failed: node scripts/seed-all-employee-data.js\\n❌ Error seeding ID templates: PrismaClientValidationError: \\nInvalid `prisma.idFormatTemplate.upsert()` invocation in\\nC:\\\\Users\\\\ticha\\\\apps\\\\multi-business-multi-apps\\\\scripts\\\\seed-id-templates.js:60:52\\n\\n  57   where: { name: template.name }\\n  58 })\\n  59 \\n→ 60 const result = await prisma.idFormatTemplate.upsert({\\n       where: {\\n         name: \\"Zimbabwe National ID\\",\\n     ?   id?: String,\\n     ?   AND?: IdFormatTemplateWhereInput | IdFormatTemplateWhereInput[],\\n     ?   OR?: IdFormatTemplateWhereInput[],\\n     ?   NOT?: IdFormatTemplateWhereInput | IdFormatTemplateWhereInput[],\\n     ?   description?: StringNullableFilter | String | Null,\\n     ?   pattern?: StringFilter | String,\\n     ?   example?: StringFilter | String,\\n     ?   countryCode?: StringNullableFilter | String | Null,\\n     ?   createdAt?: DateTimeFilter | DateTime,\\n     ?   isActive?: BoolFilter | Boolean,\\n     ?   updatedAt?: DateTimeFilter | DateTime,\\n     ?   employees?: EmployeeListRelationFilter,\\n     ?   persons?: PersonListRelationFilter\\n       },\\n       update: {\\n         description: \\"Zimbabwe national identity document format\\",\\n         pattern: \\"^[0-9]{2}-[0-9]{6,7}[A-Z][0-9]{2}$\\",\\n         example: \\"63-123456A78\\",\\n         countryCode: \\"ZW\\",\\n         isActive: true\\n       },\\n       create: {\\n         name: \\"Zimbabwe National ID\\",\\n         description: \\"Zimbabwe national identity document format\\",\\n         pattern: \\"^[0-9]{2}-[0-9]{6,7}[A-Z][0-9]{2}$\\",\\n         example: \\"63-123456A78\\",\\n         countryCode: \\"ZW\\",\\n         isActive: true\\n       }\\n     })\\n\\nArgument `where` of type IdFormatTemplateWhereUniqueInput needs at least one of `id` arguments. Available options are marked with ?.\\n    at throwValidationException (C:\\\\Users\\\\ticha\\\\apps\\\\multi-business-multi-apps\\\\node_modules\\\\@prisma\\\\client\\\\src\\\\runtime\\\\core\\\\errorRendering\\\\throwValidationException.ts:45:9)\\n    at ei.handleRequestError (C:\\\\Users\\\\ticha\\\\apps\\\\multi-business-multi-apps\\\\node_modules\\\\@prisma\\\\client\\\\src\\\\runtime\\\\RequestHandler.ts:202:7)\\n    at ei.handleAndLogRequestError (C:\\\\Users\\\\ticha\\\\apps\\\\multi-business-multi-apps\\\\node_modules\\\\@prisma\\\\client\\\\src\\\\runtime\\\\RequestHandler.ts:174:12)\\n    at ei.request (C:\\\\Users\\\\ticha\\\\apps\\\\multi-business-multi-apps\\\\node_modules\\\\@prisma\\\\client\\\\src\\\\runtime\\\\RequestHandler.ts:143:12)\\n    at a (C:\\\\Users\\\\ticha\\\\apps\\\\multi-business-multi-apps\\\\node_modules\\\\@prisma\\\\client\\\\src\\\\runtime\\\\getPrismaClient.ts:833:24)\\n    at async seedIdTemplates (C:\\\\Users\\\\ticha\\\\apps\\\\multi-business-multi-apps\\\\scripts\\\\seed-id-templates.js:60:22)\\n    at async seedAllEmployeeData (C:\\\\Users\\\\ticha\\\\apps\\\\multi-business-multi-apps\\\\scripts\\\\seed-all-employee-data.js:13:5) {\\n  clientVersion: '6.15.0'\\n}\\n❌ Error during comprehensive seeding: PrismaClientValidationError: \\nInvalid `prisma.idFormatTemplate.upsert()` invocation in\\nC:\\\\Users\\\\ticha\\\\apps\\\\multi-business-multi-apps\\\\scripts\\\\seed-id-templates.js:60:52\\n\\n  57   where: { name: template.name }\\n  58 })\\n  59 \\n→ 60 const result = await prisma.idFormatTemplate.upsert({\\n       where: {\\n         name: \\"Zimbabwe National ID\\",\\n     ?   id?: String,\\n     ?   AND?: IdFormatTemplateWhereInput | IdFormatTemplateWhereInput[],\\n     ?   OR?: IdFormatTemplateWhereInput[],\\n     ?   NOT?: IdFormatTemplateWhereInput | IdFormatTemplateWhereInput[],\\n     ?   description?: StringNullableFilter | String | Null,\\n     ?   pattern?: StringFilter | String,\\n     ?   example?: StringFilter | String,\\n     ?   countryCode?: StringNullableFilter | String | Null,\\n     ?   createdAt?: DateTimeFilter | DateTime,\\n     ?   isActive?: BoolFilter | Boolean,\\n     ?   updatedAt?: DateTimeFilter | DateTime,\\n     ?   employees?: EmployeeListRelationFilter,\\n     ?   persons?: PersonListRelationFilter\\n       },\\n       update: {\\n         description: \\"Zimbabwe national identity document format\\",\\n         pattern: \\"^[0-9]{2}-[0-9]{6,7}[A-Z][0-9]{2}$\\",\\n         example: \\"63-123456A78\\",\\n         countryCode: \\"ZW\\",\\n         isActive: true\\n       },\\n       create: {\\n         name: \\"Zimbabwe National ID\\",\\n         description: \\"Zimbabwe national identity document format\\",\\n         pattern: \\"^[0-9]{2}-[0-9]{6,7}[A-Z][0-9]{2}$\\",\\n         example: \\"63-123456A78\\",\\n         countryCode: \\"ZW\\",\\n         isActive: true\\n       }\\n     })\\n\\nArgument `where` of type IdFormatTemplateWhereUniqueInput needs at least one of `id` arguments. Available options are marked with ?.\\n    at throwValidationException (C:\\\\Users\\\\ticha\\\\apps\\\\multi-business-multi-apps\\\\node_modules\\\\@prisma\\\\client\\\\src\\\\runtime\\\\core\\\\errorRendering\\\\throwValidationException.ts:45:9)\\n    at ei.handleRequestError (C:\\\\Users\\\\ticha\\\\apps\\\\multi-business-multi-apps\\\\node_modules\\\\@prisma\\\\client\\\\src\\\\runtime\\\\RequestHandler.ts:202:7)\\n    at ei.handleAndLogRequestError (C:\\\\Users\\\\ticha\\\\apps\\\\multi-business-multi-apps\\\\node_modules\\\\@prisma\\\\client\\\\src\\\\runtime\\\\RequestHandler.ts:174:12)\\n    at ei.request (C:\\\\Users\\\\ticha\\\\apps\\\\multi-business-multi-apps\\\\node_modules\\\\@prisma\\\\client\\\\src\\\\runtime\\\\RequestHandler.ts:143:12)\\n    at a (C:\\\\Users\\\\ticha\\\\apps\\\\multi-business-multi-apps\\\\node_modules\\\\@prisma\\\\client\\\\src\\\\runtime\\\\getPrismaClient.ts:833:24)\\n    at async seedIdTemplates (C:\\\\Users\\\\ticha\\\\apps\\\\multi-business-multi-apps\\\\scripts\\\\seed-id-templates.js:60:22)\\n    at async seedAllEmployeeData (C:\\\\Users\\\\ticha\\\\apps\\\\multi-business-multi-apps\\\\scripts\\\\seed-all-employee-data.js:13:5) {\\n  clientVersion: '6.15.0'\\n}\\n❌ Comprehensive employee data seeding failed: PrismaClientValidationError: \\nInvalid `prisma.idFormatTemplate.upsert()` invocation in\\nC:\\\\Users\\\\ticha\\\\apps\\\\multi-business-multi-apps\\\\scripts\\\\seed-id-templates.js:60:52\\n\\n  57   where: { name: template.name }\\n  58 })\\n  59 \\n→ 60 const result = await prisma.idFormatTemplate.upsert({\\n       where: {\\n         name: \\"Zimbabwe National ID\\",\\n     ?   id?: String,\\n     ?   AND?: IdFormatTemplateWhereInput | IdFormatTemplateWhereInput[],\\n     ?   OR?: IdFormatTemplateWhereInput[],\\n     ?   NOT?: IdFormatTemplateWhereInput | IdFormatTemplateWhereInput[],\\n     ?   description?: StringNullableFilter | String | Null,\\n     ?   pattern?: StringFilter | String,\\n     ?   example?: StringFilter | String,\\n     ?   countryCode?: StringNullableFilter | String | Null,\\n     ?   createdAt?: DateTimeFilter | DateTime,\\n     ?   isActive?: BoolFilter | Boolean,\\n     ?   updatedAt?: DateTimeFilter | DateTime,\\n     ?   employees?: EmployeeListRelationFilter,\\n     ?   persons?: PersonListRelationFilter\\n       },\\n       update: {\\n         description: \\"Zimbabwe national identity document format\\",\\n         pattern: \\"^[0-9]{2}-[0-9]{6,7}[A-Z][0-9]{2}$\\",\\n         example: \\"63-123456A78\\",\\n         countryCode: \\"ZW\\",\\n         isActive: true\\n       },\\n       create: {\\n         name: \\"Zimbabwe National ID\\",\\n         description: \\"Zimbabwe national identity document format\\",\\n         pattern: \\"^[0-9]{2}-[0-9]{6,7}[A-Z][0-9]{2}$\\",\\n         example: \\"63-123456A78\\",\\n         countryCode: \\"ZW\\",\\n         isActive: true\\n       }\\n     })\\n\\nArgument `where` of type IdFormatTemplateWhereUniqueInput needs at least one of `id` arguments. Available options are marked with ?.\\n    at throwValidationException (C:\\\\Users\\\\ticha\\\\apps\\\\multi-business-multi-apps\\\\node_modules\\\\@prisma\\\\client\\\\src\\\\runtime\\\\core\\\\errorRendering\\\\throwValidationException.ts:45:9)\\n    at ei.handleRequestError (C:\\\\Users\\\\ticha\\\\apps\\\\multi-business-multi-apps\\\\node_modules\\\\@prisma\\\\client\\\\src\\\\runtime\\\\RequestHandler.ts:202:7)\\n    at ei.handleAndLogRequestError (C:\\\\Users\\\\ticha\\\\apps\\\\multi-business-multi-apps\\\\node_modules\\\\@prisma\\\\client\\\\src\\\\runtime\\\\RequestHandler.ts:174:12)\\n    at ei.request (C:\\\\Users\\\\ticha\\\\apps\\\\multi-business-multi-apps\\\\node_modules\\\\@prisma\\\\client\\\\src\\\\runtime\\\\RequestHandler.ts:143:12)\\n    at a (C:\\\\Users\\\\ticha\\\\apps\\\\multi-business-multi-apps\\\\node_modules\\\\@prisma\\\\client\\\\src\\\\runtime\\\\getPrismaClient.ts:833:24)\\n    at async seedIdTemplates (C:\\\\Users\\\\ticha\\\\apps\\\\multi-business-multi-apps\\\\scripts\\\\seed-id-templates.js:60:22)\\n    at async seedAllEmployeeData (C:\\\\Users\\\\ticha\\\\apps\\\\multi-business-multi-apps\\\\scripts\\\\seed-all-employee-data.js:13:5) {\\n  clientVersion: '6.15.0'\\n}\\n", "failedAt": "2025-09-16T07:39:53.896Z", "attemptedBy": {"userId": "d0e54210-5d9f-4e70-a138-5e1957cfdab4", "userName": "System Administrator", "userEmail": "admin@business.local"}}	{"hash": "44de873f7b3d80c589056af1ef2b78853974246aa540cc1c017b46c5be4499a2"}	unknown	reference-data-seed-failed-1758008393896	null	{"action": "DATA_IMPORT", "timestamp": "2025-09-16T07:39:53.896Z", "entityType": "ReferenceData"}
cmfmhg4us00041p88qfashckw	d0e54210-5d9f-4e70-a138-5e1957cfdab4	DATA_IMPORT	ReferenceData	reference-data-seed-1758022907248	2025-09-16 11:41:47.248	null	{"output": "🚀 Starting comprehensive employee data seeding...\\n🌱 Seeding ID format templates...\\n🔄 Updated ID template: Zimbabwe National ID (ZW)\\n🔄 Updated ID template: South Africa ID Number (ZA)\\n🔄 Updated ID template: Botswana Omang (BW)\\n🔄 Updated ID template: Kenya National ID (KE)\\n🔄 Updated ID template: Zambia NRC (ZM)\\n🎉 ID format templates completed: 0 created, 5 updated\\n✅ ID templates completed\\n🌱 Seeding job titles...\\n🔄 Updated job title: General Manager\\n🔄 Updated job title: Assistant Manager\\n🔄 Updated job title: Operations Manager\\n🔄 Updated job title: Project Manager\\n🔄 Updated job title: Site Supervisor\\n🔄 Updated job title: Construction Foreman\\n🔄 Updated job title: Safety Officer\\n🔄 Updated job title: Quality Control Inspector\\n🔄 Updated job title: Architect\\n🔄 Updated job title: Civil Engineer\\n🔄 Updated job title: Electrical Engineer\\n🔄 Updated job title: Mechanical Engineer\\n🔄 Updated job title: Quantity Surveyor\\n🔄 Updated job title: Estimator\\n🔄 Updated job title: Procurement Officer\\n🔄 Updated job title: Human Resources Manager\\n🔄 Updated job title: Finance Manager\\n🔄 Updated job title: Accountant\\n🔄 Updated job title: Bookkeeper\\n🔄 Updated job title: Administrative Assistant\\n🔄 Updated job title: Secretary\\n🔄 Updated job title: Driver\\n🔄 Updated job title: Security Guard\\n🔄 Updated job title: Cleaner\\n🔄 Updated job title: Mason\\n🔄 Updated job title: Carpenter\\n🔄 Updated job title: Electrician\\n🔄 Updated job title: Plumber\\n🔄 Updated job title: Welder\\n🎉 Job titles completed: 0 created, 29 updated\\n✅ Job titles completed\\n🌱 Seeding compensation types...\\n🔄 Updated compensation type: Hourly Rate\\n🔄 Updated compensation type: Daily Rate\\n🔄 Updated compensation type: Weekly Rate\\n🔄 Updated compensation type: Monthly Salary\\n🔄 Updated compensation type: Annual Salary\\n🔄 Updated compensation type: Commission Only\\n🔄 Updated compensation type: Base + Commission\\n🔄 Updated compensation type: Piece Rate\\n🔄 Updated compensation type: Project Based\\n🔄 Updated compensation type: Retainer Fee\\n🔄 Updated compensation type: Performance Bonus\\n🔄 Updated compensation type: Overtime Rate\\n🔄 Updated compensation type: Contract Rate\\n🔄 Updated compensation type: Consulting Fee\\n🔄 Updated compensation type: Freelance Rate\\n🎉 Compensation types completed: 0 created, 15 updated\\n✅ Compensation types completed\\n🌱 Seeding benefit types...\\n🔄 Updated benefit type: Health Insurance\\n🔄 Updated benefit type: Medical Aid\\n🔄 Updated benefit type: Life Insurance\\n🔄 Updated benefit type: Disability Insurance\\n🔄 Updated benefit type: Dental Coverage\\n🔄 Updated benefit type: Vision/Eye Care\\n🔄 Updated benefit type: Pension Fund\\n🔄 Updated benefit type: Retirement Savings\\n🔄 Updated benefit type: Provident Fund\\n🔄 Updated benefit type: Annual Leave\\n🔄 Updated benefit type: Sick Leave\\n🔄 Updated benefit type: Maternity Leave\\n🔄 Updated benefit type: Paternity Leave\\n🔄 Updated benefit type: Study Leave\\n🔄 Updated benefit type: Housing Allowance\\n🔄 Updated benefit type: Transport Allowance\\n🔄 Updated benefit type: Fuel Allowance\\n🔄 Updated benefit type: Mobile Phone Allowance\\n🔄 Updated benefit type: Meal Allowance\\n🔄 Updated benefit type: Uniform Allowance\\n🔄 Updated benefit type: Training & Development\\n🔄 Updated benefit type: Professional Development\\n🔄 Updated benefit type: Gym Membership\\n🔄 Updated benefit type: Company Car\\n🔄 Updated benefit type: Performance Bonus\\n🔄 Updated benefit type: 13th Cheque\\n🔄 Updated benefit type: Long Service Award\\n🔄 Updated benefit type: Employee Assistance Program\\n🎉 Benefit types completed: 0 created, 28 updated\\n✅ Benefit types completed\\n🎉 ALL EMPLOYEE DATA SEEDING COMPLETED SUCCESSFULLY!\\n📊 Summary:\\n   - 5 ID format templates\\n   - 29 Job titles\\n   - 15 Compensation types\\n   - 28 Benefit types\\n\\n✅ Your database is now ready for employee management!\\n✅ Comprehensive employee data seeding completed\\n", "seededAt": "2025-09-16T11:41:47.248Z", "seededBy": {"userId": "d0e54210-5d9f-4e70-a138-5e1957cfdab4", "userName": "System Administrator", "userEmail": "admin@business.local"}, "warnings": null, "seededData": {"jobTitles": 29, "idTemplates": 5, "benefitTypes": 28, "totalRecords": 77, "compensationTypes": 15}}	{"hash": "4c940c374880131b95d54ced5764be909f043c480f9bb7410520bb358c716889"}	unknown	reference-data-seed-1758022907248	null	{"action": "DATA_IMPORT", "timestamp": "2025-09-16T11:41:47.248Z", "entityType": "ReferenceData"}
cmfno1xyk000i1p1w868lxgif	d0e54210-5d9f-4e70-a138-5e1957cfdab4	BUSINESS_UPDATED	Business	grocery-demo-business	2025-09-17 07:34:28.652	\N	\N	\N	\N	\N	\N	{"changes": {}, "businessName": "Demo Grocery Store", "businessType": "grocery"}
cmfnoa6si000k1p1wajbbenn9	d0e54210-5d9f-4e70-a138-5e1957cfdab4	BUSINESS_UPDATED	Business	grocery-demo-business	2025-09-17 07:40:53.347	\N	\N	\N	\N	\N	\N	{"changes": {"name": {"to": "Biri Grocery Store", "from": "Demo Grocery Store"}}, "businessName": "Biri Grocery Store", "businessType": "grocery"}
cmfnob6yj000n1p1wnk3xevzu	d0e54210-5d9f-4e70-a138-5e1957cfdab4	BUSINESS_CREATED	Business	cmfnob6yg000l1p1wtvpusnb1	2025-09-17 07:41:40.22	\N	\N	\N	\N	\N	\N	{"businessName": "HXI EATS", "businessType": "restaurant"}
\.


--
-- Data for Name: benefit_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.benefit_types (id, name, description, type, "createdAt", "defaultAmount", "isActive", "isPercentage", "updatedAt") FROM stdin;
cmfmhcu33000v1p1cttwf1cze	Fuel Allowance	\N	allowance	2025-09-16 11:39:13.36	\N	t	f	2025-09-16 11:39:13.36
cmfmhcu34000w1p1c8wsvyv4z	Mobile Phone Allowance	\N	allowance	2025-09-16 11:39:13.361	\N	t	f	2025-09-16 11:39:13.361
cmfmhcu35000x1p1cuswetzzl	Meal Allowance	\N	allowance	2025-09-16 11:39:13.362	\N	t	f	2025-09-16 11:39:13.362
cmfmhcu36000y1p1c2oqhi3of	Uniform Allowance	\N	allowance	2025-09-16 11:39:13.362	\N	t	f	2025-09-16 11:39:13.362
cmfmhcu37000z1p1c902tg4ou	Training & Development	\N	development	2025-09-16 11:39:13.363	\N	t	f	2025-09-16 11:39:13.363
cmfmhcu3700101p1c152m8pzx	Professional Development	\N	development	2025-09-16 11:39:13.364	\N	t	f	2025-09-16 11:39:13.364
cmfmhcu3800111p1c5y3of4ju	Gym Membership	\N	wellness	2025-09-16 11:39:13.365	\N	t	f	2025-09-16 11:39:13.365
cmfmhcu3900121p1c1msm0udb	Company Car	\N	vehicle	2025-09-16 11:39:13.366	\N	t	f	2025-09-16 11:39:13.366
cmfmhcu3a00131p1cmiyr2uao	Performance Bonus	\N	bonus	2025-09-16 11:39:13.366	\N	t	f	2025-09-16 11:39:13.366
cmfmhcu3b00141p1cog0mddom	13th Cheque	\N	bonus	2025-09-16 11:39:13.367	\N	t	f	2025-09-16 11:39:13.367
cmfmhcu3c00151p1cswzysji2	Long Service Award	\N	bonus	2025-09-16 11:39:13.368	\N	t	f	2025-09-16 11:39:13.368
cmfmhcu3d00161p1cpsu8xwd7	Employee Assistance Program	\N	wellness	2025-09-16 11:39:13.369	\N	t	f	2025-09-16 11:39:13.369
cmfmhcu2m000f1p1c1sq4tan0	Health Insurance	\N	insurance	2025-09-16 11:39:13.342	\N	t	f	2025-09-16 11:39:13.342
cmfmhcu2o000g1p1c6kor45x9	Medical Aid	\N	insurance	2025-09-16 11:39:13.344	\N	t	f	2025-09-16 11:39:13.344
cmfmhcu2p000h1p1cyky4rzc4	Life Insurance	\N	insurance	2025-09-16 11:39:13.346	\N	t	f	2025-09-16 11:39:13.346
cmfmhcu2q000i1p1clirfkptt	Disability Insurance	\N	insurance	2025-09-16 11:39:13.347	\N	t	f	2025-09-16 11:39:13.347
cmfmhcu2r000j1p1crf7s93ym	Dental Coverage	\N	insurance	2025-09-16 11:39:13.348	\N	t	f	2025-09-16 11:39:13.348
cmfmhcu2s000k1p1cc0adlvas	Vision/Eye Care	\N	insurance	2025-09-16 11:39:13.349	\N	t	f	2025-09-16 11:39:13.349
cmfmhcu2t000l1p1c8p0wek3n	Pension Fund	\N	retirement	2025-09-16 11:39:13.35	\N	t	f	2025-09-16 11:39:13.35
cmfmhcu2u000m1p1c2s5bzlkp	Retirement Savings	\N	retirement	2025-09-16 11:39:13.351	\N	t	f	2025-09-16 11:39:13.351
cmfmhcu2v000n1p1cjh51u17x	Provident Fund	\N	retirement	2025-09-16 11:39:13.352	\N	t	f	2025-09-16 11:39:13.352
cmfmhcu2w000o1p1c86pcvrcb	Annual Leave	\N	leave	2025-09-16 11:39:13.353	\N	t	f	2025-09-16 11:39:13.353
cmfmhcu2x000p1p1cu3e8p3ah	Sick Leave	\N	leave	2025-09-16 11:39:13.354	\N	t	f	2025-09-16 11:39:13.354
cmfmhcu2z000q1p1c7ls523yo	Maternity Leave	\N	leave	2025-09-16 11:39:13.355	\N	t	f	2025-09-16 11:39:13.355
cmfmhcu30000r1p1c2ezfo5ob	Paternity Leave	\N	leave	2025-09-16 11:39:13.356	\N	t	f	2025-09-16 11:39:13.356
cmfmhcu31000s1p1c11l8ijnt	Study Leave	\N	leave	2025-09-16 11:39:13.357	\N	t	f	2025-09-16 11:39:13.357
cmfmhcu32000t1p1cfa0qtq1j	Housing Allowance	\N	allowance	2025-09-16 11:39:13.358	\N	t	f	2025-09-16 11:39:13.358
cmfmhcu33000u1p1c9mz21wbx	Transport Allowance	\N	allowance	2025-09-16 11:39:13.359	\N	t	f	2025-09-16 11:39:13.359
\.


--
-- Data for Name: business_brands; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.business_brands (id, "businessId", name, description, "logoUrl", website, "isActive", "businessType", attributes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: business_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.business_categories (id, "businessId", name, description, "parentId", "displayOrder", "isActive", "businessType", attributes, "createdAt", "updatedAt") FROM stdin;
cmfn7h5w200011p6chcjda12x	restaurant-demo	Proteins	Meat, poultry, seafood, and protein sources	\N	0	t	restaurant	\N	2025-09-16 23:50:25.298	2025-09-16 23:50:25.298
cmfn7h5w500031p6cbavw73zl	restaurant-demo	Vegetables	Fresh vegetables and produce	\N	0	t	restaurant	\N	2025-09-16 23:50:25.302	2025-09-16 23:50:25.302
cmfn7h5w700051p6cag0r8fi8	restaurant-demo	Dairy	Dairy products and eggs	\N	0	t	restaurant	\N	2025-09-16 23:50:25.303	2025-09-16 23:50:25.303
cmfn7h5w900071p6cn1hn1zxt	restaurant-demo	Pantry	Dry goods, spices, and pantry staples	\N	0	t	restaurant	\N	2025-09-16 23:50:25.305	2025-09-16 23:50:25.305
cmfn7h5wb00091p6c9rhc7kyi	restaurant-demo	Beverages	Drinks, juices, and beverage ingredients	\N	0	t	restaurant	\N	2025-09-16 23:50:25.307	2025-09-16 23:50:25.307
cmfn7h5wc000b1p6cnbu4z2xi	restaurant-demo	Supplies	Non-food supplies, disposables, and equipment	\N	0	t	restaurant	\N	2025-09-16 23:50:25.308	2025-09-16 23:50:25.308
cmfn84zkw00011ppcfjusmrur	grocery-demo-business	Fresh Produce	Fruits and vegetables	\N	0	t	grocery	\N	2025-09-17 00:08:56.864	2025-09-17 00:08:56.864
cmfn84zl000031ppcbsgy4mb4	grocery-demo-business	Dairy & Eggs	Dairy products and eggs	\N	0	t	grocery	\N	2025-09-17 00:08:56.869	2025-09-17 00:08:56.869
cmfn84zl200051ppcpjtrapjc	grocery-demo-business	Meat & Seafood	Fresh meat and seafood	\N	0	t	grocery	\N	2025-09-17 00:08:56.87	2025-09-17 00:08:56.87
cmfn84zl300071ppc7fv7lo6a	grocery-demo-business	Bakery	Baked goods and bread	\N	0	t	grocery	\N	2025-09-17 00:08:56.872	2025-09-17 00:08:56.872
cmfn84zl500091ppcpajj0a3k	grocery-demo-business	Frozen Foods	Frozen food items	\N	0	t	grocery	\N	2025-09-17 00:08:56.873	2025-09-17 00:08:56.873
cmfn84zl6000b1ppcxxzq46ja	grocery-demo-business	Pantry Staples	Canned goods, dry goods, spices	\N	0	t	grocery	\N	2025-09-17 00:08:56.874	2025-09-17 00:08:56.874
cmfn84zl7000d1ppclsd66sbf	grocery-demo-business	Beverages	Drinks and beverages	\N	0	t	grocery	\N	2025-09-17 00:08:56.875	2025-09-17 00:08:56.875
cmfn84zl8000f1ppc4tc98yir	grocery-demo-business	Snacks & Candy	Snacks, chips, candy	\N	0	t	grocery	\N	2025-09-17 00:08:56.877	2025-09-17 00:08:56.877
cmfn84zl9000h1ppcyc1yb5go	grocery-demo-business	Health & Beauty	Personal care and health products	\N	0	t	grocery	\N	2025-09-17 00:08:56.878	2025-09-17 00:08:56.878
cmfn84zlb000j1ppctpqv5jbt	grocery-demo-business	Household	Cleaning supplies and household items	\N	0	t	grocery	\N	2025-09-17 00:08:56.879	2025-09-17 00:08:56.879
\.


--
-- Data for Name: business_customers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.business_customers (id, "businessId", "customerNumber", name, email, phone, "dateOfBirth", address, city, country, "customerType", segment, "loyaltyPoints", "totalSpent", "isActive", "businessType", attributes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: business_memberships; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.business_memberships (id, "userId", "businessId", role, permissions, "isActive", "invitedBy", "joinedAt", "lastAccessedAt", "templateId") FROM stdin;
cmfn5z9at00031pfk33o0fbpp	d0e54210-5d9f-4e70-a138-5e1957cfdab4	grocery-demo-business	owner	{"canManagePos": true, "canManageUsers": true, "canViewReports": true, "canManageOrders": true, "canManageSettings": true, "canManageInventory": true}	t	\N	2025-09-16 23:08:30.28	\N	\N
cmfn5z9an00011pfk7msy0jvg	d0e54210-5d9f-4e70-a138-5e1957cfdab4	restaurant-demo	owner	{"canManagePos": true, "canManageUsers": true, "canViewReports": true, "canManageOrders": true, "canManageSettings": true, "canManageInventory": true}	t	\N	2025-09-16 23:08:30.273	2025-09-17 00:56:28.591	\N
cmfosa4qv000b1p1wsy9k9dhz	cmfosa4qp000a1p1wm8pizuuh	cmfnob6yg000l1p1wtvpusnb1	employee	{"canViewReports": false, "canViewBusiness": true, "canViewEmployees": false}	t	d0e54210-5d9f-4e70-a138-5e1957cfdab4	2025-09-18 02:20:35.334	2025-09-18 17:06:13.684	\N
cmfosa4qv000c1p1w880mmp14	cmfosa4qp000a1p1wm8pizuuh	grocery-demo-business	Employee	{"canViewReports": false, "canViewBusiness": true, "canViewEmployees": false}	t	d0e54210-5d9f-4e70-a138-5e1957cfdab4	2025-09-18 02:20:35.334	2025-09-18 17:11:50.724	\N
cmfn5z9aw00051pfk33zi717d	d0e54210-5d9f-4e70-a138-5e1957cfdab4	clothing-demo	owner	{"canManagePos": true, "canManageUsers": true, "canViewReports": true, "canManageOrders": true, "canManageSettings": true, "canManageInventory": true}	t	\N	2025-09-16 23:08:30.283	2025-09-18 17:14:14.554	\N
cmfn5z9az00071pfk11it23e0	d0e54210-5d9f-4e70-a138-5e1957cfdab4	hardware-demo	owner	{"canManagePos": true, "canManageUsers": true, "canViewReports": true, "canManageOrders": true, "canManageSettings": true, "canManageInventory": true}	t	\N	2025-09-16 23:08:30.286	2025-09-18 17:14:17.84	\N
\.


--
-- Data for Name: business_order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.business_order_items (id, "orderId", "productVariantId", quantity, "unitPrice", "discountAmount", "totalPrice", attributes, "createdAt") FROM stdin;
\.


--
-- Data for Name: business_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.business_orders (id, "businessId", "orderNumber", "customerId", "employeeId", "orderType", status, subtotal, "taxAmount", "discountAmount", "totalAmount", "paymentMethod", "paymentStatus", "businessType", attributes, notes, "processedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: business_products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.business_products (id, "businessId", name, description, sku, barcode, "brandId", "categoryId", "productType", condition, "basePrice", "costPrice", "isActive", "businessType", attributes, "isAvailable", "spiceLevel", "dietaryRestrictions", allergens, "preparationTime", calories, "isCombo", "comboItemsData", "originalPrice", "discountPercent", "discountAmount", "promotionStartDate", "promotionEndDate", "promotionName", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: business_stock_movements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.business_stock_movements (id, "businessId", "productVariantId", "movementType", quantity, "unitCost", reference, reason, "employeeId", "businessType", attributes, "createdAt", "businessProductId") FROM stdin;
\.


--
-- Data for Name: business_suppliers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.business_suppliers (id, "businessId", "supplierNumber", name, "contactPerson", email, phone, address, "paymentTerms", "creditLimit", "isActive", "businessType", attributes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: businesses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.businesses (id, name, type, description, "isActive", settings, "createdBy", "createdAt", "updatedAt", "umbrellaBusinessId", "isUmbrellaBusiness", "umbrellaBusinessName", "umbrellaBusinessAddress", "umbrellaBusinessEmail", "umbrellaBusinessPhone", "umbrellaBusinessRegistration") FROM stdin;
restaurant-demo	Demo Restaurant	restaurant	Demo restaurant for testing restaurant features	t	{"email": "restaurant@demo.com", "phone": "+1-555-0100", "address": "123 Demo Street"}	d0e54210-5d9f-4e70-a138-5e1957cfdab4	2025-09-16 23:08:30.283	2025-09-16 23:08:30.283	\N	f	Demo Umbrella Company	\N	\N	\N	\N
clothing-demo	Demo Clothing Store	clothing	Demo clothing store for testing clothing features	t	{"email": "clothing@demo.com", "phone": "+1-555-0300", "address": "789 Demo Boulevard"}	d0e54210-5d9f-4e70-a138-5e1957cfdab4	2025-09-16 23:08:30.295	2025-09-16 23:08:30.295	\N	f	Demo Umbrella Company	\N	\N	\N	\N
hardware-demo	Demo Hardware Store	hardware	Demo hardware store for testing hardware features	t	{"email": "hardware@demo.com", "phone": "+1-555-0400", "address": "321 Demo Lane"}	d0e54210-5d9f-4e70-a138-5e1957cfdab4	2025-09-16 23:08:30.298	2025-09-16 23:08:30.298	\N	f	Demo Umbrella Company	\N	\N	\N	\N
grocery-demo-business	Biri Grocery Store	grocery	Demo grocery store for testing grocery features	t	{"email": "grocery@demo.com", "phone": "+1-555-0200", "address": "456 Demo Avenue"}	d0e54210-5d9f-4e70-a138-5e1957cfdab4	2025-09-16 23:08:30.292	2025-09-17 07:40:53.344	\N	f	Demo Umbrella Company	\N	\N	\N	\N
cmfnob6yg000l1p1wtvpusnb1	HXI EATS	restaurant	HXI Takeaway	t	{}	d0e54210-5d9f-4e70-a138-5e1957cfdab4	2025-09-17 07:41:40.216	2025-09-17 07:41:40.216	\N	f	Demo Umbrella Company	\N	\N	\N	\N
cmfm7tjs900001p889hbqca58	Umbrella Business Settings	umbrella	\N	t	{}	\N	2025-09-16 07:12:17	2025-09-17 19:36:36.835	\N	t	Hwanda Enterprises PBC			+263 784869759	788 3438782 238723
\.


--
-- Data for Name: chat_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.chat_messages (id, message, "createdAt", "roomId", "userId") FROM stdin;
\.


--
-- Data for Name: chat_participants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.chat_participants (id, "joinedAt", "roomId", "userId") FROM stdin;
\.


--
-- Data for Name: chat_rooms; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.chat_rooms (id, name, type, "createdAt", "createdBy") FROM stdin;
\.


--
-- Data for Name: compensation_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.compensation_types (id, name, type, description, "baseAmount", "commissionPercentage", "createdAt", "isActive", "updatedAt", frequency) FROM stdin;
cmfmhcu1c00001p1cny6wtsqr	Hourly Rate	hourly	\N	\N	\N	2025-09-16 11:39:13.296	t	2025-09-16 11:39:13.296	monthly
cmfmhcu1e00011p1ckwftfxvb	Daily Rate	daily	\N	\N	\N	2025-09-16 11:39:13.298	t	2025-09-16 11:39:13.298	monthly
cmfmhcu1f00021p1cg0ka5zx6	Weekly Rate	weekly	\N	\N	\N	2025-09-16 11:39:13.3	t	2025-09-16 11:39:13.3	monthly
cmfmhcu1g00031p1chr4uba19	Monthly Salary	monthly	\N	\N	\N	2025-09-16 11:39:13.301	t	2025-09-16 11:39:13.301	monthly
cmfmhcu1h00041p1c9i0umhst	Annual Salary	annual	\N	\N	\N	2025-09-16 11:39:13.302	t	2025-09-16 11:39:13.302	monthly
cmfmhcu1i00051p1cmmt6wd9s	Commission Only	commission	\N	\N	\N	2025-09-16 11:39:13.303	t	2025-09-16 11:39:13.303	monthly
cmfmhcu1j00061p1cwqlsdhon	Base + Commission	base_plus_commission	\N	\N	\N	2025-09-16 11:39:13.304	t	2025-09-16 11:39:13.304	monthly
cmfmhcu1l00071p1cwrhiqef0	Piece Rate	piece_rate	\N	\N	\N	2025-09-16 11:39:13.305	t	2025-09-16 11:39:13.305	monthly
cmfmhcu1m00081p1c49edxw9z	Project Based	project	\N	\N	\N	2025-09-16 11:39:13.306	t	2025-09-16 11:39:13.306	monthly
cmfmhcu1o00091p1coz39oh7n	Retainer Fee	retainer	\N	\N	\N	2025-09-16 11:39:13.308	t	2025-09-16 11:39:13.308	monthly
cmfmhcu1p000a1p1ce7dp9r35	Performance Bonus	bonus	\N	\N	\N	2025-09-16 11:39:13.309	t	2025-09-16 11:39:13.309	monthly
cmfmhcu1q000b1p1cqdvta3uf	Overtime Rate	overtime	\N	\N	\N	2025-09-16 11:39:13.31	t	2025-09-16 11:39:13.31	monthly
cmfmhcu1q000c1p1cjn60lmbn	Contract Rate	contract	\N	\N	\N	2025-09-16 11:39:13.311	t	2025-09-16 11:39:13.311	monthly
cmfmhcu1r000d1p1cwmsfojus	Consulting Fee	consulting	\N	\N	\N	2025-09-16 11:39:13.312	t	2025-09-16 11:39:13.312	monthly
cmfmhcu1s000e1p1chfogk1e9	Freelance Rate	freelance	\N	\N	\N	2025-09-16 11:39:13.313	t	2025-09-16 11:39:13.313	monthly
\.


--
-- Data for Name: construction_expenses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.construction_expenses (id, category, description, amount, vendor, "createdAt", "createdBy", "projectId", "receiptUrl") FROM stdin;
\.


--
-- Data for Name: construction_projects; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.construction_projects (id, name, description, status, budget, "createdAt", "createdBy", "endDate", "startDate", "updatedAt") FROM stdin;
\.


--
-- Data for Name: contract_benefits; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contract_benefits (id, amount, notes, "benefitTypeId", "contractId", "createdAt", "isPercentage") FROM stdin;
\.


--
-- Data for Name: contract_renewals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contract_renewals (id, status, notes, "autoRenewalMonths", "benefitChanges", "createdAt", "employeeId", "isAutoRenewal", "jobTitleChange", "managerNotifiedAt", "newContractId", "originalContractId", "processedAt", "processedBy", "reminderSentAt", "renewalDueDate", "salaryChange", "salaryChangeType", "updatedAt") FROM stdin;
\.


--
-- Data for Name: disciplinary_actions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.disciplinary_actions (id, "employeeId", "actionType", "violationType", title, description, "incidentDate", "actionDate", severity, "isActive", "improvementPlan", "followUpDate", "followUpNotes", "createdBy", "hrReviewed", "hrReviewedBy", "hrReviewedAt", "hrNotes", "employeeAcknowledged", "employeeResponse", "employeeSignedAt", attachments, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: driver_authorizations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.driver_authorizations (id, "driverId", "vehicleId", "authorizedBy", "authorizedDate", "expiryDate", "isActive", "authorizationLevel", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: driver_license_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.driver_license_templates (id, name, description, pattern, example, "countryCode", "createdAt", "isActive", "updatedAt") FROM stdin;
cmfmirvbv00001pgc122dc1e4	Zimbabwe Driver License	Zimbabwe driver license format (any number of digits followed by 1-2 letters)	^\\d+ [A-Z]{1,2}$	62724 DK or 1234567890 A	ZW	2025-09-16 12:18:54.428	t	2025-09-16 12:18:54.428
cmfmirvby00011pgc5oym4wgj	US Driver License	United States driver license format (varies by state)	^[A-Z0-9]{6,20}$	D123456789	US	2025-09-16 12:18:54.431	t	2025-09-16 12:18:54.431
cmfmirvc000021pgc84avtgtx	South African Driver License	South African driver license format	^\\d{8}_\\d{2}_\\d{2}$	12345678_01_01	ZA	2025-09-16 12:18:54.433	t	2025-09-16 12:18:54.433
cmfmirvc200031pgcyhn25u7j	UK Driver License	United Kingdom driver license format	^[A-Z]{5}\\d{6}[A-Z]{2}\\d[A-Z]{2}$	SMITH806280M99AA	GB	2025-09-16 12:18:54.435	t	2025-09-16 12:18:54.435
cmfmirvc400041pgclbze5i2s	Canada Driver License	Canadian driver license format (varies by province)	^[A-Z]\\d{4}-\\d{5}-\\d{5}$	S1234-12345-12345	CA	2025-09-16 12:18:54.436	t	2025-09-16 12:18:54.436
cmfmirvc500051pgc21z1x86a	Australia Driver License	Australian driver license format (varies by state)	^\\d{8,9}$	123456789	AU	2025-09-16 12:18:54.437	t	2025-09-16 12:18:54.437
cmfmirvc600061pgcidom3fda	Botswana Driver License	Botswana driver license format	^[A-Z]{2}\\d{6}$	BL123456	BW	2025-09-16 12:18:54.438	t	2025-09-16 12:18:54.438
cmfmirvc700071pgcjdb20xkt	Zambian Driver License	Zambian driver license format	^\\d{7}$	1234567	ZM	2025-09-16 12:18:54.439	t	2025-09-16 12:18:54.439
cmfmirvc800081pgcm58uuyih	Kenya Driver License	Kenyan driver license format	^\\d{8}$	12345678	KE	2025-09-16 12:18:54.44	t	2025-09-16 12:18:54.44
\.


--
-- Data for Name: employee_allowances; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employee_allowances (id, "employeeId", type, amount, description, "payrollMonth", "payrollYear", "approvedBy", "approvedAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: employee_attendance; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employee_attendance (id, date, status, notes, "checkIn", "checkOut", "createdAt", "employeeId", "hoursWorked") FROM stdin;
\.


--
-- Data for Name: employee_benefits; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employee_benefits (id, amount, notes, "benefitTypeId", "createdAt", "effectiveDate", "employeeId", "endDate", "isActive", "isPercentage", "updatedAt") FROM stdin;
\.


--
-- Data for Name: employee_bonuses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employee_bonuses (id, amount, "approvedAt", "approvedBy", "createdAt", "employeeId", reason, type) FROM stdin;
\.


--
-- Data for Name: employee_business_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employee_business_assignments (id, role, notes, "assignedBy", "businessId", "createdAt", "employeeId", "endDate", "isActive", "isPrimary", "startDate", "updatedAt") FROM stdin;
cmfnog3id000t1p1w3uq1oxa9	Employee	\N	d0e54210-5d9f-4e70-a138-5e1957cfdab4	cmfnob6yg000l1p1wtvpusnb1	2025-09-17 07:45:29.03	cmfnog3hv000p1p1wr5wb6keb	\N	t	t	2025-09-17 07:45:29.03	2025-09-17 07:45:29.03
cmfnoy6ct000z1p1whf8a0l59	Employee	\N	d0e54210-5d9f-4e70-a138-5e1957cfdab4	cmfnob6yg000l1p1wtvpusnb1	2025-09-17 07:59:32.525	cmfnoy6cc000v1p1woohns7yv	\N	t	t	2025-09-17 07:59:32.525	2025-09-17 07:59:32.525
cmfnoy6cx00101p1w3v14wmij	Employee	\N	d0e54210-5d9f-4e70-a138-5e1957cfdab4	grocery-demo-business	2025-09-17 07:59:32.529	cmfnoy6cc000v1p1woohns7yv	\N	t	f	2025-09-17 07:59:32.529	2025-09-17 07:59:32.529
\.


--
-- Data for Name: employee_contracts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employee_contracts (id, version, status, notes, "additionalBusinesses", "approvedAt", "approvedBy", "baseSalary", "compensationTypeId", "contractNumber", "createdAt", "createdBy", "customResponsibilities", "employeeId", "employeeSignedAt", "endDate", "isCommissionBased", "isSalaryBased", "jobTitleId", "managerSignedAt", "pdfUrl", "primaryBusinessId", "probationPeriodMonths", "signedPdfUrl", "startDate", "supervisorId", "supervisorName", "supervisorTitle", "updatedAt", "commissionAmount", "contractDurationMonths", "livingAllowance", "pdfGenerationData", "umbrellaBusinessId", "umbrellaBusinessName", "businessAssignments") FROM stdin;
cmfood49g00031pbsdpurv08f	1	active	\N	\N	\N	\N	75000.00	cmfmhcu1c00001p1cny6wtsqr	CON999TEST	2025-09-18 00:30:56.212	system-test	\N	cmfood49b00011pbs6giam7xu	2025-09-18 00:30:56.21	\N	f	t	cmfmhbayr00001pfgeve2fl19	\N	\N	restaurant-demo	\N	\N	2025-09-18 00:30:56.21	\N	\N	\N	2025-09-18 00:30:56.212	\N	\N	\N	\N	\N	Hwanda Enterprises LLC	\N
cmfoq5unv00091p1wi93fkfig	1	active	\N	\N	\N	\N	145.00	cmfmhcu1g00031p1chr4uba19	CON1758158476408	2025-09-18 01:21:16.411	d0e54210-5d9f-4e70-a138-5e1957cfdab4	\N	cmfnoy6cc000v1p1woohns7yv	2025-09-18 01:35:09.6	\N	f	t	cmfmhbayr00001pfgeve2fl19	\N	\N	cmfnob6yg000l1p1wtvpusnb1	\N	\N	2025-09-18 00:00:00	\N	\N	\N	2025-09-18 01:21:16.411	\N	\N	\N	{"date": "2025-09-18T01:21:15.416Z", "notes": "HR role. In the abasense of other managers you will act as Supervisor", "version": 1, "benefits": [{"name": "Fuel Allowance", "type": "allowance", "notes": "", "amount": 30, "isPercentage": false}, {"name": "Housing Allowance", "type": "allowance", "notes": "", "amount": 14.98, "isPercentage": false}], "jobTitle": "General Manager", "commission": 0, "department": "", "nationalId": "08-767676 D 45", "basicSalary": 145, "businessName": "HXI EATS", "businessType": "restaurant", "employeeName": "Mary Hwandaza", "businessEmail": "", "businessPhone": "", "employeeEmail": "mary@hxi.com", "employeePhone": "+263 7788967676", "isSalaryBased": true, "specialDuties": "", "contractNumber": "CON-EMP000002-2025", "employeeNumber": "EMP000002", "supervisorName": "", "businessAddress": "", "contractEndDate": "", "employeeAddress": "", "livingAllowance": 0, "supervisorTitle": "", "compensationType": "Monthly Salary", "contractDuration": "permanent", "responsibilities": [], "contractStartDate": "2025-09-18", "isCommissionBased": false, "businessAssignments": [{"role": "Employee", "isPrimary": true, "startDate": "2025-09-17T07:59:32.525Z", "businessId": "cmfnob6yg000l1p1wtvpusnb1", "businessName": "HXI EATS", "businessType": "restaurant"}, {"role": "Employee", "isPrimary": false, "startDate": "2025-09-17T07:59:32.529Z", "businessId": "grocery-demo-business", "businessName": "Biri Grocery Store", "businessType": "grocery"}], "driverLicenseNumber": "", "employeeAddressLine2": "", "umbrellaBusinessName": "Hwanda Enterprises PBC", "probationPeriodMonths": 3, "umbrellaBusinessEmail": "", "umbrellaBusinessPhone": "", "customResponsibilities": "Responsible for the day to day running of the business. Including making sure that the business\\nadhere to statutory regulations regarding workers", "umbrellaBusinessAddress": "", "businessRegistrationNumber": "", "umbrellaBusinessRegistration": ""}	\N	Hwanda Enterprises PBC	[{"role": "Employee", "isPrimary": true, "startDate": "2025-09-17T07:59:32.525Z", "businessId": "cmfnob6yg000l1p1wtvpusnb1", "businessName": "HXI EATS", "businessType": "restaurant"}, {"role": "Employee", "isPrimary": false, "startDate": "2025-09-17T07:59:32.529Z", "businessId": "grocery-demo-business", "businessName": "Biri Grocery Store", "businessType": "grocery"}]
\.


--
-- Data for Name: employee_deduction_payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employee_deduction_payments (id, amount, "createdAt", "deductionId", "paymentDate", "processedBy") FROM stdin;
\.


--
-- Data for Name: employee_deductions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employee_deductions (id, amount, "approvedAt", "approvedBy", "createdAt", "employeeId", reason, type) FROM stdin;
\.


--
-- Data for Name: employee_leave_balance; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employee_leave_balance (id, year, "annualLeaveDays", "createdAt", "employeeId", "remainingAnnual", "remainingSick", "sickLeaveDays", "updatedAt", "usedAnnualDays", "usedSickDays") FROM stdin;
cmfnog3i8000r1p1ww7798lsq	2025	21	2025-09-17 07:45:29.025	cmfnog3hv000p1p1wr5wb6keb	21	10	10	2025-09-17 07:45:29.025	0	0
cmfnoy6cm000x1p1wnqmptmpr	2025	21	2025-09-17 07:59:32.519	cmfnoy6cc000v1p1woohns7yv	21	10	10	2025-09-17 07:59:32.519	0	0
\.


--
-- Data for Name: employee_leave_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employee_leave_requests (id, reason, status, "approvedAt", "approvedBy", "createdAt", "daysRequested", "employeeId", "endDate", "leaveType", "rejectionReason", "startDate", "updatedAt") FROM stdin;
\.


--
-- Data for Name: employee_loan_payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employee_loan_payments (id, amount, "createdAt", "loanId", "paymentDate", "processedBy") FROM stdin;
\.


--
-- Data for Name: employee_loans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employee_loans (id, status, "approvedAt", "approvedBy", "createdAt", "employeeId", "loanAmount", "monthlyDeduction", "remainingBalance", "remainingMonths", "totalMonths", "updatedAt") FROM stdin;
\.


--
-- Data for Name: employee_salary_increases; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employee_salary_increases (id, reason, "approvedAt", "approvedBy", "createdAt", "effectiveDate", "employeeId", "increaseAmount", "increasePercent", "newSalary", "previousSalary") FROM stdin;
\.


--
-- Data for Name: employee_time_tracking; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employee_time_tracking (id, "employeeId", year, month, "workDays", "totalHours", "overtimeHours", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employees (id, email, phone, address, "employmentStatus", notes, "compensationTypeId", "createdAt", "createdBy", "customResponsibilities", "dateOfBirth", "employeeNumber", "firstName", "fullName", "hireDate", "idFormatTemplateId", "isActive", "jobTitleId", "lastName", "nationalId", "primaryBusinessId", "profilePhotoUrl", "startDate", "supervisorId", "terminationDate", "updatedAt", "userId", "driverLicenseNumber", "driverLicenseTemplateId") FROM stdin;
cmfnoy6cc000v1p1woohns7yv	mary@hxi.com	+263 7788967676	\N	active	HR Manager	cmfmhcu1g00031p1chr4uba19	2025-09-17 07:59:32.508	d0e54210-5d9f-4e70-a138-5e1957cfdab4	\N	2001-03-22 00:00:00	EMP000002	Mary	Mary Hwandaza	2025-09-30 00:00:00	cmfm8wyzp00001pek06cu95hb	t	cmfmhbayr00001pfgeve2fl19	Hwandaza	08-767676 D 45	cmfnob6yg000l1p1wtvpusnb1	\N	\N	\N	\N	2025-09-18 02:19:02.531	cmfosa4qp000a1p1wm8pizuuh	\N	\N
cmfnog3hv000p1p1wr5wb6keb	chipo@hxi.com	+263 4567855555	\N	active	Can act as cashier when required	cmfmhcu1g00031p1chr4uba19	2025-09-17 07:45:29.011	d0e54210-5d9f-4e70-a138-5e1957cfdab4	\N	2004-03-12 00:00:00	EMP000001	Chipo	Chipo Ndoro	2025-10-01 00:00:00	cmfm8wyzp00001pek06cu95hb	t	cmfmhbazh000n1pfgwi8bd35y	Ndoro	63-438884 H 27	cmfnob6yg000l1p1wtvpusnb1	\N	2025-10-01 00:00:00	\N	\N	2025-09-17 07:45:29.011	\N	\N	\N
cmfood49b00011pbs6giam7xu	test.salary@example.com	+263771234567	\N	active	\N	cmfmhcu1c00001p1cny6wtsqr	2025-09-18 00:30:56.207	\N	\N	\N	EMP999TEST	Test	Test Employee Salary	2025-09-18 00:30:56.204	\N	t	cmfmhbayr00001pfgeve2fl19	Employee	12-345678A90	restaurant-demo	\N	\N	\N	\N	2025-09-18 00:30:56.207	\N	\N	\N
\.


--
-- Data for Name: expense_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.expense_categories (id, name, emoji, color, "createdAt", "isDefault", "userId") FROM stdin;
cmfna7cch00031p1w7swichhd	Utilities	💡	#F59E0B	2025-09-17 01:06:45.953	t	d0e54210-5d9f-4e70-a138-5e1957cfdab4
cmfna7cch00041p1wetjii30v	Food & Dining	🍽️	#EF4444	2025-09-17 01:06:45.953	t	d0e54210-5d9f-4e70-a138-5e1957cfdab4
cmfna7cch00051p1wspqt9i7l	Entertainment	🎬	#8B5CF6	2025-09-17 01:06:45.953	t	d0e54210-5d9f-4e70-a138-5e1957cfdab4
cmfna7cdp00071p1w1x8k4kj6	Transportation	🚗	#3B82F6	2025-09-17 01:06:45.953	t	d0e54210-5d9f-4e70-a138-5e1957cfdab4
cmfna7cdx00091p1whxkk2mqh	Other	💰	#6B7280	2025-09-17 01:06:45.953	t	d0e54210-5d9f-4e70-a138-5e1957cfdab4
cmfna7ce1000b1p1wnitmudur	Healthcare	🏥	#EC4899	2025-09-17 01:06:45.953	t	d0e54210-5d9f-4e70-a138-5e1957cfdab4
cmfna7ce3000d1p1w66aue1rc	Education	📚	#6366F1	2025-09-17 01:06:45.953	t	d0e54210-5d9f-4e70-a138-5e1957cfdab4
cmfna7ce3000f1p1wpxscwg5o	Shopping	🛒	#10B981	2025-09-17 01:06:45.953	t	d0e54210-5d9f-4e70-a138-5e1957cfdab4
\.


--
-- Data for Name: fund_sources; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fund_sources (id, name, emoji, "createdAt", "isDefault", "usageCount", "userId") FROM stdin;
\.


--
-- Data for Name: id_format_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.id_format_templates (id, name, description, pattern, example, "countryCode", "createdAt", "isActive", "updatedAt") FROM stdin;
cmfm8wyzt00021pek560i34jj	Botswana Omang	Botswana national identity card format	^[0-9]{9}$	123456789	BW	2025-09-16 07:42:56.298	t	2025-09-16 07:42:56.298
cmfm8wyzv00031pekv7cqpje6	Kenya National ID	Kenya national identity card format	^[0-9]{8}$	12345678	KE	2025-09-16 07:42:56.3	t	2025-09-16 07:42:56.3
cmfm8wyzx00041pekbsvq9x49	Zambia NRC	Zambia National Registration Card format	^[0-9]{6}/[0-9]{2}/[0-9]{1}$	123456/78/1	ZM	2025-09-16 07:42:56.302	t	2025-09-16 07:42:56.302
cmfm8wyzp00001pek06cu95hb	Zimbabwe National ID	Zimbabwe national identity document format (supports both 10 and 11 character formats)	^[0-9]{2}-[0-9]{6,7}\\s[A-Z]\\s[0-9]{2}$	08-123456 D 53 or 08-1234567 D 53	ZW	2025-09-16 07:42:56.293	t	2025-09-16 07:42:56.293
cmfm8wyzs00011peky4yh7zcc	South Africa ID Number	South African identity number format	^[0-9]{13}$	8001015009087	ZA	2025-09-16 07:42:56.296	t	2025-09-16 07:42:56.296
\.


--
-- Data for Name: inter_business_loans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inter_business_loans (id, "loanNumber", "principalAmount", "interestRate", "totalAmount", "remainingBalance", "lenderType", "lenderUserId", "lenderBusinessId", "borrowerBusinessId", "loanDate", "dueDate", status, terms, notes, "createdAt", "updatedAt", "createdBy", "borrowerPersonId", "borrowerType") FROM stdin;
\.


--
-- Data for Name: job_titles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.job_titles (id, title, description, responsibilities, department, level, "createdAt", "isActive", "updatedAt") FROM stdin;
cmfmhbayr00001pfgeve2fl19	General Manager	\N	\N	\N	\N	2025-09-16 11:38:01.923	t	2025-09-16 11:38:01.923
cmfmhbayt00011pfg6fz03smf	Assistant Manager	\N	\N	\N	\N	2025-09-16 11:38:01.926	t	2025-09-16 11:38:01.926
cmfmhbayu00021pfg82qolctg	Operations Manager	\N	\N	\N	\N	2025-09-16 11:38:01.927	t	2025-09-16 11:38:01.927
cmfmhbayw00031pfggzr0u2or	Project Manager	\N	\N	\N	\N	2025-09-16 11:38:01.928	t	2025-09-16 11:38:01.928
cmfmhbayx00041pfgj78klbe4	Site Supervisor	\N	\N	\N	\N	2025-09-16 11:38:01.93	t	2025-09-16 11:38:01.93
cmfmhbayz00051pfgsomw3m7k	Construction Foreman	\N	\N	\N	\N	2025-09-16 11:38:01.932	t	2025-09-16 11:38:01.932
cmfmhbaz100061pfgrjs2w1zw	Safety Officer	\N	\N	\N	\N	2025-09-16 11:38:01.933	t	2025-09-16 11:38:01.933
cmfmhbaz200071pfgukjmguvs	Quality Control Inspector	\N	\N	\N	\N	2025-09-16 11:38:01.934	t	2025-09-16 11:38:01.934
cmfmhbaz400081pfgbcidxh42	Architect	\N	\N	\N	\N	2025-09-16 11:38:01.936	t	2025-09-16 11:38:01.936
cmfmhbaz500091pfgt8cygq8p	Civil Engineer	\N	\N	\N	\N	2025-09-16 11:38:01.937	t	2025-09-16 11:38:01.937
cmfmhbaz6000a1pfgzh53arir	Electrical Engineer	\N	\N	\N	\N	2025-09-16 11:38:01.938	t	2025-09-16 11:38:01.938
cmfmhbaz6000b1pfggvlyeswv	Mechanical Engineer	\N	\N	\N	\N	2025-09-16 11:38:01.939	t	2025-09-16 11:38:01.939
cmfmhbaz7000c1pfgkp2smps7	Quantity Surveyor	\N	\N	\N	\N	2025-09-16 11:38:01.94	t	2025-09-16 11:38:01.94
cmfmhbaz8000d1pfgzd6cmtmo	Estimator	\N	\N	\N	\N	2025-09-16 11:38:01.94	t	2025-09-16 11:38:01.94
cmfmhbaz9000e1pfg0ayca3ch	Procurement Officer	\N	\N	\N	\N	2025-09-16 11:38:01.941	t	2025-09-16 11:38:01.941
cmfmhbaza000f1pfg07knqgxe	Human Resources Manager	\N	\N	\N	\N	2025-09-16 11:38:01.942	t	2025-09-16 11:38:01.942
cmfmhbaza000g1pfg6ew4rwye	Finance Manager	\N	\N	\N	\N	2025-09-16 11:38:01.943	t	2025-09-16 11:38:01.943
cmfmhbazb000h1pfgj7cqsh2c	Accountant	\N	\N	\N	\N	2025-09-16 11:38:01.944	t	2025-09-16 11:38:01.944
cmfmhbazc000i1pfgceq4mkea	Bookkeeper	\N	\N	\N	\N	2025-09-16 11:38:01.944	t	2025-09-16 11:38:01.944
cmfmhbazd000j1pfgizguxykm	Administrative Assistant	\N	\N	\N	\N	2025-09-16 11:38:01.945	t	2025-09-16 11:38:01.945
cmfmhbaze000k1pfgluke18wi	Secretary	\N	\N	\N	\N	2025-09-16 11:38:01.947	t	2025-09-16 11:38:01.947
cmfmhbazf000l1pfgxsqo2mof	Driver	\N	\N	\N	\N	2025-09-16 11:38:01.948	t	2025-09-16 11:38:01.948
cmfmhbazg000m1pfgdup0phg8	Security Guard	\N	\N	\N	\N	2025-09-16 11:38:01.949	t	2025-09-16 11:38:01.949
cmfmhbazh000n1pfgwi8bd35y	Cleaner	\N	\N	\N	\N	2025-09-16 11:38:01.95	t	2025-09-16 11:38:01.95
cmfmhbazi000o1pfguc7niydh	Mason	\N	\N	\N	\N	2025-09-16 11:38:01.951	t	2025-09-16 11:38:01.951
cmfmhbazj000p1pfgeo9qytce	Carpenter	\N	\N	\N	\N	2025-09-16 11:38:01.951	t	2025-09-16 11:38:01.951
cmfmhbazk000q1pfg1cirdcbr	Electrician	\N	\N	\N	\N	2025-09-16 11:38:01.952	t	2025-09-16 11:38:01.952
cmfmhbazl000r1pfg4mls5pjg	Plumber	\N	\N	\N	\N	2025-09-16 11:38:01.953	t	2025-09-16 11:38:01.953
cmfmhbazl000s1pfg4176zqr8	Welder	\N	\N	\N	\N	2025-09-16 11:38:01.954	t	2025-09-16 11:38:01.954
\.


--
-- Data for Name: loan_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.loan_transactions (id, "loanId", "transactionType", amount, description, "transactionDate", "personalExpenseId", "businessTransactionId", "isAutoGenerated", "autoGeneratedNote", "initiatedFrom", "balanceAfter", "createdAt", "createdBy") FROM stdin;
\.


--
-- Data for Name: menu_combo_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.menu_combo_items (id, "comboId", "productId", "variantId", quantity, "isRequired", "sortOrder", "createdAt") FROM stdin;
\.


--
-- Data for Name: menu_combos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.menu_combos (id, "businessId", name, description, "totalPrice", "originalTotalPrice", "isActive", "isAvailable", "imageUrl", "preparationTime", "discountPercent", "promotionStartDate", "promotionEndDate", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: menu_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.menu_items (id, name, description, price, category, barcode, "createdAt", "isAvailable", "updatedAt") FROM stdin;
\.


--
-- Data for Name: menu_promotions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.menu_promotions (id, "businessId", name, description, type, value, "minOrderAmount", "maxDiscountAmount", "startDate", "endDate", "startTime", "endTime", "daysOfWeek", "isActive", "usageLimit", "usageCount", "applicableCategories", "applicableProducts", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_items (id, quantity, price, notes, "menuItemId", "orderId") FROM stdin;
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (id, total, status, "createdAt", "createdBy", "orderNumber", "tableNumber") FROM stdin;
\.


--
-- Data for Name: permission_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.permission_templates (id, name, permissions, "businessType", "createdAt", "createdBy", "isActive", "updatedAt") FROM stdin;
\.


--
-- Data for Name: personal_budgets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.personal_budgets (id, amount, description, type, "createdAt", "userId") FROM stdin;
\.


--
-- Data for Name: personal_expenses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.personal_expenses (id, category, description, amount, date, tags, "createdAt", "receiptUrl", "userId") FROM stdin;
\.


--
-- Data for Name: persons; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.persons (id, email, phone, address, notes, "createdAt", "createdBy", "fullName", "idFormatTemplateId", "isActive", "nationalId", "updatedAt", "driverLicenseNumber", "driverLicenseTemplateId") FROM stdin;
\.


--
-- Data for Name: product_attributes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_attributes (id, "productId", key, value, "dataType", "displayOrder", "createdAt") FROM stdin;
\.


--
-- Data for Name: product_images; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_images (id, "productId", "imageUrl", "altText", "isPrimary", "sortOrder", "imageSize", "businessType", attributes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: product_variants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_variants (id, "productId", name, sku, barcode, price, "stockQuantity", "reorderLevel", "isActive", attributes, "isAvailable", "originalPrice", "discountPercent", "discountAmount", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: project_contractors; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.project_contractors (id, role, status, notes, "createdAt", "endDate", "hourlyRate", "isPrimary", "personId", "projectId", "startDate", "totalContractAmount", "updatedAt") FROM stdin;
\.


--
-- Data for Name: project_stages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.project_stages (id, name, description, status, notes, "completionDate", "createdAt", "endDate", "estimatedAmount", "orderIndex", "projectId", "startDate", "updatedAt") FROM stdin;
\.


--
-- Data for Name: project_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.project_transactions (id, amount, description, status, notes, "approvedAt", "approvedBy", "createdAt", "createdBy", "paidAt", "paymentCategory", "paymentMethod", "personalExpenseId", "projectContractorId", "projectId", "receiptUrl", "recipientPersonId", "referenceNumber", "stageAssignmentId", "stageId", "transactionType", "updatedAt") FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sessions (id, "sessionToken", "userId", expires) FROM stdin;
\.


--
-- Data for Name: stage_contractor_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stage_contractor_assignments (id, notes, "createdAt", "depositAmount", "depositPaidDate", "depositPercentage", "finalPaymentDate", "isDepositPaid", "isFinalPaymentMade", "predeterminedAmount", "projectContractorId", "stageId", "updatedAt") FROM stdin;
\.


--
-- Data for Name: supplier_products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.supplier_products (id, "supplierId", "productId", "supplierSku", "supplierPrice", "minimumOrder", "leadTimeDays", "isActive", attributes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, "passwordHash", name, role, permissions, "isActive", "passwordResetRequired", "deactivatedAt", "deactivatedBy", "deactivationReason", "deactivationNotes", "reactivatedAt", "reactivatedBy", "reactivationNotes", "createdAt", "updatedAt") FROM stdin;
d0e54210-5d9f-4e70-a138-5e1957cfdab4	admin@business.local	$2b$12$nzCrIL.wHFjHYBDX3FpDneYt.ZdK8.J/TSklOXQx7wkcQQvo/1ve.	System Administrator	admin	{"admin": ["manage_users", "backup_restore"], "grocery": ["read", "write", "delete", "reports", "pos"], "clothing": ["read", "write", "delete", "reports", "pos"], "personal": ["read", "write", "delete", "reports"], "restaurant": ["read", "write", "delete", "reports", "pos"], "construction": ["read", "write", "delete", "reports"]}	t	f	\N	\N	\N	\N	\N	\N	\N	2025-09-15 01:29:47.943	2025-09-15 01:29:47.943
cmfnnyyxo000g1p1wx7deka0v	miro@hxi.com	$2b$12$qKAMMJEsnvhK2k9GvrS4..cUztloe6UJXZ0Ox0Ve//LXYyHCNI5xu	Miriro Hwandaza	user	{}	t	f	\N	\N	\N	\N	\N	\N	\N	2025-09-17 07:32:09.949	2025-09-17 07:32:09.949
cmfosa4qp000a1p1wm8pizuuh	mary@hxi.com	$2b$12$hwPEvd6Mf4TKPvfH2Thrp.IIL8yzRCaOuTJWNWE6SY9lHcxTcf49e	Mary Hwandaza	user	{}	t	f	\N	\N	\N	\N	\N	\N	\N	2025-09-18 02:20:35.33	2025-09-18 02:20:35.33
\.


--
-- Data for Name: vehicle_drivers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.vehicle_drivers (id, "fullName", "licenseNumber", "licenseExpiry", "phoneNumber", "emailAddress", "emergencyContact", "emergencyPhone", "userId", "isActive", "dateOfBirth", address, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: vehicle_expenses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.vehicle_expenses (id, "vehicleId", "tripId", "businessId", "expenseType", "expenseCategory", amount, currency, "expenseDate", "isBusinessDeductible", "receiptUrl", "vendorName", description, "mileageAtExpense", "fuelQuantity", "fuelType", "createdBy", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: vehicle_licenses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.vehicle_licenses (id, "vehicleId", "licenseType", "licenseNumber", "issuingAuthority", "issueDate", "expiryDate", "renewalCost", "isActive", "documentUrl", "reminderDays", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: vehicle_maintenance_records; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.vehicle_maintenance_records (id, "vehicleId", "serviceType", "serviceCategory", "serviceName", "serviceDate", "mileageAtService", "nextServiceDue", "nextServiceMileage", "serviceCost", "serviceProvider", "serviceLocation", "partsReplaced", "warrantyInfo", "receiptUrl", notes, "isScheduledService", "createdBy", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: vehicle_reimbursements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.vehicle_reimbursements (id, "userId", "vehicleId", "businessId", "reimbursementPeriod", "totalMileage", "businessMileage", "personalMileage", "statutoryRate", "totalAmount", status, "submissionDate", "approvalDate", "paymentDate", "approvedBy", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: vehicle_trips; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.vehicle_trips (id, "vehicleId", "driverId", "businessId", "startMileage", "endMileage", "tripMileage", "tripPurpose", "tripType", "startLocation", "endLocation", "startTime", "endTime", "isCompleted", notes, "gpsTrackingData", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: vehicles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.vehicles (id, "licensePlate", vin, make, model, year, color, weight, "driveType", "ownershipType", "currentMileage", "businessId", "userId", "isActive", "purchaseDate", "purchasePrice", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: benefit_types benefit_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.benefit_types
    ADD CONSTRAINT benefit_types_pkey PRIMARY KEY (id);


--
-- Name: business_brands business_brands_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_brands
    ADD CONSTRAINT business_brands_pkey PRIMARY KEY (id);


--
-- Name: business_categories business_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_categories
    ADD CONSTRAINT business_categories_pkey PRIMARY KEY (id);


--
-- Name: business_customers business_customers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_customers
    ADD CONSTRAINT business_customers_pkey PRIMARY KEY (id);


--
-- Name: business_memberships business_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_memberships
    ADD CONSTRAINT business_memberships_pkey PRIMARY KEY (id);


--
-- Name: business_order_items business_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_order_items
    ADD CONSTRAINT business_order_items_pkey PRIMARY KEY (id);


--
-- Name: business_orders business_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_orders
    ADD CONSTRAINT business_orders_pkey PRIMARY KEY (id);


--
-- Name: business_products business_products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_products
    ADD CONSTRAINT business_products_pkey PRIMARY KEY (id);


--
-- Name: business_stock_movements business_stock_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_stock_movements
    ADD CONSTRAINT business_stock_movements_pkey PRIMARY KEY (id);


--
-- Name: business_suppliers business_suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_suppliers
    ADD CONSTRAINT business_suppliers_pkey PRIMARY KEY (id);


--
-- Name: businesses businesses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: chat_participants chat_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_participants
    ADD CONSTRAINT chat_participants_pkey PRIMARY KEY (id);


--
-- Name: chat_rooms chat_rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_rooms
    ADD CONSTRAINT chat_rooms_pkey PRIMARY KEY (id);


--
-- Name: compensation_types compensation_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.compensation_types
    ADD CONSTRAINT compensation_types_pkey PRIMARY KEY (id);


--
-- Name: construction_expenses construction_expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.construction_expenses
    ADD CONSTRAINT construction_expenses_pkey PRIMARY KEY (id);


--
-- Name: construction_projects construction_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.construction_projects
    ADD CONSTRAINT construction_projects_pkey PRIMARY KEY (id);


--
-- Name: contract_benefits contract_benefits_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_benefits
    ADD CONSTRAINT contract_benefits_pkey PRIMARY KEY (id);


--
-- Name: contract_renewals contract_renewals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_renewals
    ADD CONSTRAINT contract_renewals_pkey PRIMARY KEY (id);


--
-- Name: disciplinary_actions disciplinary_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disciplinary_actions
    ADD CONSTRAINT disciplinary_actions_pkey PRIMARY KEY (id);


--
-- Name: driver_authorizations driver_authorizations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.driver_authorizations
    ADD CONSTRAINT driver_authorizations_pkey PRIMARY KEY (id);


--
-- Name: driver_license_templates driver_license_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.driver_license_templates
    ADD CONSTRAINT driver_license_templates_pkey PRIMARY KEY (id);


--
-- Name: employee_allowances employee_allowances_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_allowances
    ADD CONSTRAINT employee_allowances_pkey PRIMARY KEY (id);


--
-- Name: employee_attendance employee_attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_attendance
    ADD CONSTRAINT employee_attendance_pkey PRIMARY KEY (id);


--
-- Name: employee_benefits employee_benefits_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_benefits
    ADD CONSTRAINT employee_benefits_pkey PRIMARY KEY (id);


--
-- Name: employee_bonuses employee_bonuses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_bonuses
    ADD CONSTRAINT employee_bonuses_pkey PRIMARY KEY (id);


--
-- Name: employee_business_assignments employee_business_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_business_assignments
    ADD CONSTRAINT employee_business_assignments_pkey PRIMARY KEY (id);


--
-- Name: employee_contracts employee_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_contracts
    ADD CONSTRAINT employee_contracts_pkey PRIMARY KEY (id);


--
-- Name: employee_deduction_payments employee_deduction_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_deduction_payments
    ADD CONSTRAINT employee_deduction_payments_pkey PRIMARY KEY (id);


--
-- Name: employee_deductions employee_deductions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_deductions
    ADD CONSTRAINT employee_deductions_pkey PRIMARY KEY (id);


--
-- Name: employee_leave_balance employee_leave_balance_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_leave_balance
    ADD CONSTRAINT employee_leave_balance_pkey PRIMARY KEY (id);


--
-- Name: employee_leave_requests employee_leave_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_leave_requests
    ADD CONSTRAINT employee_leave_requests_pkey PRIMARY KEY (id);


--
-- Name: employee_loan_payments employee_loan_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_loan_payments
    ADD CONSTRAINT employee_loan_payments_pkey PRIMARY KEY (id);


--
-- Name: employee_loans employee_loans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_loans
    ADD CONSTRAINT employee_loans_pkey PRIMARY KEY (id);


--
-- Name: employee_salary_increases employee_salary_increases_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_salary_increases
    ADD CONSTRAINT employee_salary_increases_pkey PRIMARY KEY (id);


--
-- Name: employee_time_tracking employee_time_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_time_tracking
    ADD CONSTRAINT employee_time_tracking_pkey PRIMARY KEY (id);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: expense_categories expense_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_pkey PRIMARY KEY (id);


--
-- Name: fund_sources fund_sources_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fund_sources
    ADD CONSTRAINT fund_sources_pkey PRIMARY KEY (id);


--
-- Name: id_format_templates id_format_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.id_format_templates
    ADD CONSTRAINT id_format_templates_pkey PRIMARY KEY (id);


--
-- Name: inter_business_loans inter_business_loans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inter_business_loans
    ADD CONSTRAINT inter_business_loans_pkey PRIMARY KEY (id);


--
-- Name: job_titles job_titles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_titles
    ADD CONSTRAINT job_titles_pkey PRIMARY KEY (id);


--
-- Name: loan_transactions loan_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loan_transactions
    ADD CONSTRAINT loan_transactions_pkey PRIMARY KEY (id);


--
-- Name: menu_combo_items menu_combo_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_combo_items
    ADD CONSTRAINT menu_combo_items_pkey PRIMARY KEY (id);


--
-- Name: menu_combos menu_combos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_combos
    ADD CONSTRAINT menu_combos_pkey PRIMARY KEY (id);


--
-- Name: menu_items menu_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_pkey PRIMARY KEY (id);


--
-- Name: menu_promotions menu_promotions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_promotions
    ADD CONSTRAINT menu_promotions_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: permission_templates permission_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permission_templates
    ADD CONSTRAINT permission_templates_pkey PRIMARY KEY (id);


--
-- Name: personal_budgets personal_budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personal_budgets
    ADD CONSTRAINT personal_budgets_pkey PRIMARY KEY (id);


--
-- Name: personal_expenses personal_expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personal_expenses
    ADD CONSTRAINT personal_expenses_pkey PRIMARY KEY (id);


--
-- Name: persons persons_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_pkey PRIMARY KEY (id);


--
-- Name: product_attributes product_attributes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_attributes
    ADD CONSTRAINT product_attributes_pkey PRIMARY KEY (id);


--
-- Name: product_images product_images_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_pkey PRIMARY KEY (id);


--
-- Name: product_variants product_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_pkey PRIMARY KEY (id);


--
-- Name: project_contractors project_contractors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_contractors
    ADD CONSTRAINT project_contractors_pkey PRIMARY KEY (id);


--
-- Name: project_stages project_stages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_stages
    ADD CONSTRAINT project_stages_pkey PRIMARY KEY (id);


--
-- Name: project_transactions project_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_transactions
    ADD CONSTRAINT project_transactions_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: stage_contractor_assignments stage_contractor_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stage_contractor_assignments
    ADD CONSTRAINT stage_contractor_assignments_pkey PRIMARY KEY (id);


--
-- Name: supplier_products supplier_products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_products
    ADD CONSTRAINT supplier_products_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vehicle_drivers vehicle_drivers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_drivers
    ADD CONSTRAINT vehicle_drivers_pkey PRIMARY KEY (id);


--
-- Name: vehicle_expenses vehicle_expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_expenses
    ADD CONSTRAINT vehicle_expenses_pkey PRIMARY KEY (id);


--
-- Name: vehicle_licenses vehicle_licenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_licenses
    ADD CONSTRAINT vehicle_licenses_pkey PRIMARY KEY (id);


--
-- Name: vehicle_maintenance_records vehicle_maintenance_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_maintenance_records
    ADD CONSTRAINT vehicle_maintenance_records_pkey PRIMARY KEY (id);


--
-- Name: vehicle_reimbursements vehicle_reimbursements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_reimbursements
    ADD CONSTRAINT vehicle_reimbursements_pkey PRIMARY KEY (id);


--
-- Name: vehicle_trips vehicle_trips_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_trips
    ADD CONSTRAINT vehicle_trips_pkey PRIMARY KEY (id);


--
-- Name: vehicles vehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_pkey PRIMARY KEY (id);


--
-- Name: accounts_provider_providerAccountId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON public.accounts USING btree (provider, "providerAccountId");


--
-- Name: benefit_types_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX benefit_types_name_key ON public.benefit_types USING btree (name);


--
-- Name: business_brands_businessId_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "business_brands_businessId_name_key" ON public.business_brands USING btree ("businessId", name);


--
-- Name: business_categories_businessId_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "business_categories_businessId_name_key" ON public.business_categories USING btree ("businessId", name);


--
-- Name: business_customers_businessId_customerNumber_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "business_customers_businessId_customerNumber_key" ON public.business_customers USING btree ("businessId", "customerNumber");


--
-- Name: business_memberships_userId_businessId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "business_memberships_userId_businessId_key" ON public.business_memberships USING btree ("userId", "businessId");


--
-- Name: business_orders_businessId_orderNumber_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "business_orders_businessId_orderNumber_key" ON public.business_orders USING btree ("businessId", "orderNumber");


--
-- Name: business_products_businessId_sku_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "business_products_businessId_sku_key" ON public.business_products USING btree ("businessId", sku);


--
-- Name: business_suppliers_businessId_supplierNumber_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "business_suppliers_businessId_supplierNumber_key" ON public.business_suppliers USING btree ("businessId", "supplierNumber");


--
-- Name: compensation_types_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX compensation_types_name_key ON public.compensation_types USING btree (name);


--
-- Name: driver_authorizations_driverId_vehicleId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "driver_authorizations_driverId_vehicleId_key" ON public.driver_authorizations USING btree ("driverId", "vehicleId");


--
-- Name: employee_attendance_employeeId_date_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "employee_attendance_employeeId_date_key" ON public.employee_attendance USING btree ("employeeId", date);


--
-- Name: employee_business_assignments_employeeId_businessId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "employee_business_assignments_employeeId_businessId_key" ON public.employee_business_assignments USING btree ("employeeId", "businessId");


--
-- Name: employee_contracts_contractNumber_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "employee_contracts_contractNumber_key" ON public.employee_contracts USING btree ("contractNumber");


--
-- Name: employee_leave_balance_employeeId_year_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "employee_leave_balance_employeeId_year_key" ON public.employee_leave_balance USING btree ("employeeId", year);


--
-- Name: employee_time_tracking_employeeId_year_month_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "employee_time_tracking_employeeId_year_month_key" ON public.employee_time_tracking USING btree ("employeeId", year, month);


--
-- Name: employees_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX employees_email_key ON public.employees USING btree (email);


--
-- Name: employees_employeeNumber_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "employees_employeeNumber_key" ON public.employees USING btree ("employeeNumber");


--
-- Name: employees_nationalId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "employees_nationalId_key" ON public.employees USING btree ("nationalId");


--
-- Name: employees_userId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "employees_userId_key" ON public.employees USING btree ("userId");


--
-- Name: inter_business_loans_loanNumber_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "inter_business_loans_loanNumber_key" ON public.inter_business_loans USING btree ("loanNumber");


--
-- Name: job_titles_title_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX job_titles_title_key ON public.job_titles USING btree (title);


--
-- Name: orders_orderNumber_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "orders_orderNumber_key" ON public.orders USING btree ("orderNumber");


--
-- Name: persons_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX persons_email_key ON public.persons USING btree (email);


--
-- Name: persons_nationalId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "persons_nationalId_key" ON public.persons USING btree ("nationalId");


--
-- Name: product_attributes_productId_key_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "product_attributes_productId_key_key" ON public.product_attributes USING btree ("productId", key);


--
-- Name: product_variants_sku_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX product_variants_sku_key ON public.product_variants USING btree (sku);


--
-- Name: project_contractors_projectId_personId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "project_contractors_projectId_personId_key" ON public.project_contractors USING btree ("projectId", "personId");


--
-- Name: sessions_sessionToken_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "sessions_sessionToken_key" ON public.sessions USING btree ("sessionToken");


--
-- Name: stage_contractor_assignments_stageId_projectContractorId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "stage_contractor_assignments_stageId_projectContractorId_key" ON public.stage_contractor_assignments USING btree ("stageId", "projectContractorId");


--
-- Name: supplier_products_supplierId_productId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "supplier_products_supplierId_productId_key" ON public.supplier_products USING btree ("supplierId", "productId");


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: vehicle_drivers_licenseNumber_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "vehicle_drivers_licenseNumber_key" ON public.vehicle_drivers USING btree ("licenseNumber");


--
-- Name: vehicles_licensePlate_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "vehicles_licensePlate_key" ON public.vehicles USING btree ("licensePlate");


--
-- Name: vehicles_vin_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX vehicles_vin_key ON public.vehicles USING btree (vin);


--
-- Name: accounts accounts_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: business_brands business_brands_businessId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_brands
    ADD CONSTRAINT "business_brands_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES public.businesses(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: business_categories business_categories_businessId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_categories
    ADD CONSTRAINT "business_categories_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES public.businesses(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: business_categories business_categories_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_categories
    ADD CONSTRAINT "business_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public.business_categories(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: business_customers business_customers_businessId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_customers
    ADD CONSTRAINT "business_customers_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES public.businesses(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: business_memberships business_memberships_businessId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_memberships
    ADD CONSTRAINT "business_memberships_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES public.businesses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: business_memberships business_memberships_templateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_memberships
    ADD CONSTRAINT "business_memberships_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES public.permission_templates(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: business_memberships business_memberships_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_memberships
    ADD CONSTRAINT "business_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: business_order_items business_order_items_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_order_items
    ADD CONSTRAINT "business_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public.business_orders(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: business_order_items business_order_items_productVariantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_order_items
    ADD CONSTRAINT "business_order_items_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES public.product_variants(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: business_orders business_orders_businessId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_orders
    ADD CONSTRAINT "business_orders_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES public.businesses(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: business_orders business_orders_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_orders
    ADD CONSTRAINT "business_orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public.business_customers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: business_orders business_orders_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_orders
    ADD CONSTRAINT "business_orders_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: business_products business_products_brandId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_products
    ADD CONSTRAINT "business_products_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES public.business_brands(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: business_products business_products_businessId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_products
    ADD CONSTRAINT "business_products_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES public.businesses(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: business_products business_products_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_products
    ADD CONSTRAINT "business_products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.business_categories(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: business_stock_movements business_stock_movements_businessId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_stock_movements
    ADD CONSTRAINT "business_stock_movements_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES public.businesses(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: business_stock_movements business_stock_movements_businessProductId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_stock_movements
    ADD CONSTRAINT "business_stock_movements_businessProductId_fkey" FOREIGN KEY ("businessProductId") REFERENCES public.business_products(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: business_stock_movements business_stock_movements_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_stock_movements
    ADD CONSTRAINT "business_stock_movements_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: business_stock_movements business_stock_movements_productVariantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_stock_movements
    ADD CONSTRAINT "business_stock_movements_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES public.product_variants(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: business_suppliers business_suppliers_businessId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_suppliers
    ADD CONSTRAINT "business_suppliers_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES public.businesses(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: businesses businesses_umbrellaBusinessId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT "businesses_umbrellaBusinessId_fkey" FOREIGN KEY ("umbrellaBusinessId") REFERENCES public.businesses(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: chat_messages chat_messages_roomId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT "chat_messages_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES public.chat_rooms(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT "chat_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: chat_participants chat_participants_roomId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_participants
    ADD CONSTRAINT "chat_participants_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES public.chat_rooms(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: chat_participants chat_participants_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_participants
    ADD CONSTRAINT "chat_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: chat_rooms chat_rooms_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_rooms
    ADD CONSTRAINT "chat_rooms_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: construction_expenses construction_expenses_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.construction_expenses
    ADD CONSTRAINT "construction_expenses_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: construction_expenses construction_expenses_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.construction_expenses
    ADD CONSTRAINT "construction_expenses_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public.construction_projects(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: construction_projects construction_projects_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.construction_projects
    ADD CONSTRAINT "construction_projects_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: contract_benefits contract_benefits_benefitTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_benefits
    ADD CONSTRAINT "contract_benefits_benefitTypeId_fkey" FOREIGN KEY ("benefitTypeId") REFERENCES public.benefit_types(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: contract_benefits contract_benefits_contractId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_benefits
    ADD CONSTRAINT "contract_benefits_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES public.employee_contracts(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: contract_renewals contract_renewals_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_renewals
    ADD CONSTRAINT "contract_renewals_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: contract_renewals contract_renewals_newContractId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_renewals
    ADD CONSTRAINT "contract_renewals_newContractId_fkey" FOREIGN KEY ("newContractId") REFERENCES public.employee_contracts(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: contract_renewals contract_renewals_originalContractId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_renewals
    ADD CONSTRAINT "contract_renewals_originalContractId_fkey" FOREIGN KEY ("originalContractId") REFERENCES public.employee_contracts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: disciplinary_actions disciplinary_actions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disciplinary_actions
    ADD CONSTRAINT disciplinary_actions_created_by_fkey FOREIGN KEY ("createdBy") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: disciplinary_actions disciplinary_actions_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disciplinary_actions
    ADD CONSTRAINT disciplinary_actions_employee_id_fkey FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: driver_authorizations driver_authorizations_authorizedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.driver_authorizations
    ADD CONSTRAINT "driver_authorizations_authorizedBy_fkey" FOREIGN KEY ("authorizedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: driver_authorizations driver_authorizations_driverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.driver_authorizations
    ADD CONSTRAINT "driver_authorizations_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES public.vehicle_drivers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: driver_authorizations driver_authorizations_vehicleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.driver_authorizations
    ADD CONSTRAINT "driver_authorizations_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES public.vehicles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: employee_allowances employee_allowances_approvedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_allowances
    ADD CONSTRAINT "employee_allowances_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: employee_allowances employee_allowances_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_allowances
    ADD CONSTRAINT "employee_allowances_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: employee_attendance employee_attendance_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_attendance
    ADD CONSTRAINT "employee_attendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: employee_benefits employee_benefits_benefitTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_benefits
    ADD CONSTRAINT "employee_benefits_benefitTypeId_fkey" FOREIGN KEY ("benefitTypeId") REFERENCES public.benefit_types(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: employee_benefits employee_benefits_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_benefits
    ADD CONSTRAINT "employee_benefits_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: employee_bonuses employee_bonuses_approvedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_bonuses
    ADD CONSTRAINT "employee_bonuses_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: employee_bonuses employee_bonuses_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_bonuses
    ADD CONSTRAINT "employee_bonuses_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: employee_business_assignments employee_business_assignments_businessId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_business_assignments
    ADD CONSTRAINT "employee_business_assignments_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES public.businesses(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: employee_business_assignments employee_business_assignments_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_business_assignments
    ADD CONSTRAINT "employee_business_assignments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: employee_contracts employee_contracts_compensationTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_contracts
    ADD CONSTRAINT "employee_contracts_compensationTypeId_fkey" FOREIGN KEY ("compensationTypeId") REFERENCES public.compensation_types(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: employee_contracts employee_contracts_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_contracts
    ADD CONSTRAINT "employee_contracts_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: employee_contracts employee_contracts_jobTitleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_contracts
    ADD CONSTRAINT "employee_contracts_jobTitleId_fkey" FOREIGN KEY ("jobTitleId") REFERENCES public.job_titles(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: employee_contracts employee_contracts_primaryBusinessId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_contracts
    ADD CONSTRAINT "employee_contracts_primaryBusinessId_fkey" FOREIGN KEY ("primaryBusinessId") REFERENCES public.businesses(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: employee_contracts employee_contracts_supervisorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_contracts
    ADD CONSTRAINT "employee_contracts_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: employee_contracts employee_contracts_umbrellaBusinessId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_contracts
    ADD CONSTRAINT "employee_contracts_umbrellaBusinessId_fkey" FOREIGN KEY ("umbrellaBusinessId") REFERENCES public.businesses(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: employee_deduction_payments employee_deduction_payments_deductionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_deduction_payments
    ADD CONSTRAINT "employee_deduction_payments_deductionId_fkey" FOREIGN KEY ("deductionId") REFERENCES public.employee_deductions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: employee_deduction_payments employee_deduction_payments_processedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_deduction_payments
    ADD CONSTRAINT "employee_deduction_payments_processedBy_fkey" FOREIGN KEY ("processedBy") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: employee_deductions employee_deductions_approvedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_deductions
    ADD CONSTRAINT "employee_deductions_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: employee_deductions employee_deductions_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_deductions
    ADD CONSTRAINT "employee_deductions_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: employee_leave_balance employee_leave_balance_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_leave_balance
    ADD CONSTRAINT "employee_leave_balance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: employee_leave_requests employee_leave_requests_approvedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_leave_requests
    ADD CONSTRAINT "employee_leave_requests_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: employee_leave_requests employee_leave_requests_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_leave_requests
    ADD CONSTRAINT "employee_leave_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: employee_loan_payments employee_loan_payments_loanId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_loan_payments
    ADD CONSTRAINT "employee_loan_payments_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES public.employee_loans(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: employee_loan_payments employee_loan_payments_processedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_loan_payments
    ADD CONSTRAINT "employee_loan_payments_processedBy_fkey" FOREIGN KEY ("processedBy") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: employee_loans employee_loans_approvedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_loans
    ADD CONSTRAINT "employee_loans_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: employee_loans employee_loans_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_loans
    ADD CONSTRAINT "employee_loans_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: employee_salary_increases employee_salary_increases_approvedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_salary_increases
    ADD CONSTRAINT "employee_salary_increases_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: employee_salary_increases employee_salary_increases_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_salary_increases
    ADD CONSTRAINT "employee_salary_increases_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: employee_time_tracking employee_time_tracking_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_time_tracking
    ADD CONSTRAINT "employee_time_tracking_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: employees employees_compensationTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "employees_compensationTypeId_fkey" FOREIGN KEY ("compensationTypeId") REFERENCES public.compensation_types(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: employees employees_driverLicenseTemplateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "employees_driverLicenseTemplateId_fkey" FOREIGN KEY ("driverLicenseTemplateId") REFERENCES public.driver_license_templates(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: employees employees_idFormatTemplateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "employees_idFormatTemplateId_fkey" FOREIGN KEY ("idFormatTemplateId") REFERENCES public.id_format_templates(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: employees employees_jobTitleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "employees_jobTitleId_fkey" FOREIGN KEY ("jobTitleId") REFERENCES public.job_titles(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: employees employees_primaryBusinessId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "employees_primaryBusinessId_fkey" FOREIGN KEY ("primaryBusinessId") REFERENCES public.businesses(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: employees employees_supervisorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "employees_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: employees employees_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "employees_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: expense_categories expense_categories_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT "expense_categories_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: fund_sources fund_sources_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fund_sources
    ADD CONSTRAINT "fund_sources_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: inter_business_loans inter_business_loans_borrowerBusinessId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inter_business_loans
    ADD CONSTRAINT "inter_business_loans_borrowerBusinessId_fkey" FOREIGN KEY ("borrowerBusinessId") REFERENCES public.businesses(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: inter_business_loans inter_business_loans_borrowerPersonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inter_business_loans
    ADD CONSTRAINT "inter_business_loans_borrowerPersonId_fkey" FOREIGN KEY ("borrowerPersonId") REFERENCES public.persons(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: inter_business_loans inter_business_loans_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inter_business_loans
    ADD CONSTRAINT "inter_business_loans_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: inter_business_loans inter_business_loans_lenderBusinessId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inter_business_loans
    ADD CONSTRAINT "inter_business_loans_lenderBusinessId_fkey" FOREIGN KEY ("lenderBusinessId") REFERENCES public.businesses(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: inter_business_loans inter_business_loans_lenderUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inter_business_loans
    ADD CONSTRAINT "inter_business_loans_lenderUserId_fkey" FOREIGN KEY ("lenderUserId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: loan_transactions loan_transactions_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loan_transactions
    ADD CONSTRAINT "loan_transactions_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: loan_transactions loan_transactions_loanId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loan_transactions
    ADD CONSTRAINT "loan_transactions_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES public.inter_business_loans(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: loan_transactions loan_transactions_personalExpenseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loan_transactions
    ADD CONSTRAINT "loan_transactions_personalExpenseId_fkey" FOREIGN KEY ("personalExpenseId") REFERENCES public.personal_expenses(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: menu_combo_items menu_combo_items_comboId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_combo_items
    ADD CONSTRAINT "menu_combo_items_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES public.menu_combos(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: menu_combo_items menu_combo_items_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_combo_items
    ADD CONSTRAINT "menu_combo_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES public.business_products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: menu_combo_items menu_combo_items_variantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_combo_items
    ADD CONSTRAINT "menu_combo_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES public.product_variants(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: menu_combos menu_combos_businessId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_combos
    ADD CONSTRAINT "menu_combos_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES public.businesses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: menu_promotions menu_promotions_businessId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_promotions
    ADD CONSTRAINT "menu_promotions_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES public.businesses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: order_items order_items_menuItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT "order_items_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES public.menu_items(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: order_items order_items_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: orders orders_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "orders_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: permission_templates permission_templates_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permission_templates
    ADD CONSTRAINT "permission_templates_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: personal_budgets personal_budgets_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personal_budgets
    ADD CONSTRAINT "personal_budgets_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: personal_expenses personal_expenses_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personal_expenses
    ADD CONSTRAINT "personal_expenses_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: persons persons_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT "persons_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: persons persons_driverLicenseTemplateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT "persons_driverLicenseTemplateId_fkey" FOREIGN KEY ("driverLicenseTemplateId") REFERENCES public.driver_license_templates(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: persons persons_idFormatTemplateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT "persons_idFormatTemplateId_fkey" FOREIGN KEY ("idFormatTemplateId") REFERENCES public.id_format_templates(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: product_attributes product_attributes_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_attributes
    ADD CONSTRAINT "product_attributes_productId_fkey" FOREIGN KEY ("productId") REFERENCES public.business_products(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: product_images product_images_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT "product_images_productId_fkey" FOREIGN KEY ("productId") REFERENCES public.business_products(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: product_variants product_variants_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT "product_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES public.business_products(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: project_contractors project_contractors_personId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_contractors
    ADD CONSTRAINT "project_contractors_personId_fkey" FOREIGN KEY ("personId") REFERENCES public.persons(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: project_contractors project_contractors_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_contractors
    ADD CONSTRAINT "project_contractors_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public.construction_projects(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: project_stages project_stages_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_stages
    ADD CONSTRAINT "project_stages_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public.construction_projects(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: project_transactions project_transactions_approvedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_transactions
    ADD CONSTRAINT "project_transactions_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: project_transactions project_transactions_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_transactions
    ADD CONSTRAINT "project_transactions_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: project_transactions project_transactions_personalExpenseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_transactions
    ADD CONSTRAINT "project_transactions_personalExpenseId_fkey" FOREIGN KEY ("personalExpenseId") REFERENCES public.personal_expenses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: project_transactions project_transactions_projectContractorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_transactions
    ADD CONSTRAINT "project_transactions_projectContractorId_fkey" FOREIGN KEY ("projectContractorId") REFERENCES public.project_contractors(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: project_transactions project_transactions_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_transactions
    ADD CONSTRAINT "project_transactions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public.construction_projects(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: project_transactions project_transactions_recipientPersonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_transactions
    ADD CONSTRAINT "project_transactions_recipientPersonId_fkey" FOREIGN KEY ("recipientPersonId") REFERENCES public.persons(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: project_transactions project_transactions_stageAssignmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_transactions
    ADD CONSTRAINT "project_transactions_stageAssignmentId_fkey" FOREIGN KEY ("stageAssignmentId") REFERENCES public.stage_contractor_assignments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: project_transactions project_transactions_stageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_transactions
    ADD CONSTRAINT "project_transactions_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES public.project_stages(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: sessions sessions_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: stage_contractor_assignments stage_contractor_assignments_projectContractorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stage_contractor_assignments
    ADD CONSTRAINT "stage_contractor_assignments_projectContractorId_fkey" FOREIGN KEY ("projectContractorId") REFERENCES public.project_contractors(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: stage_contractor_assignments stage_contractor_assignments_stageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stage_contractor_assignments
    ADD CONSTRAINT "stage_contractor_assignments_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES public.project_stages(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: supplier_products supplier_products_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_products
    ADD CONSTRAINT "supplier_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES public.business_products(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: supplier_products supplier_products_supplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_products
    ADD CONSTRAINT "supplier_products_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public.business_suppliers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: vehicle_drivers vehicle_drivers_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_drivers
    ADD CONSTRAINT "vehicle_drivers_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: vehicle_expenses vehicle_expenses_businessId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_expenses
    ADD CONSTRAINT "vehicle_expenses_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES public.businesses(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: vehicle_expenses vehicle_expenses_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_expenses
    ADD CONSTRAINT "vehicle_expenses_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: vehicle_expenses vehicle_expenses_tripId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_expenses
    ADD CONSTRAINT "vehicle_expenses_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES public.vehicle_trips(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: vehicle_expenses vehicle_expenses_vehicleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_expenses
    ADD CONSTRAINT "vehicle_expenses_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES public.vehicles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: vehicle_licenses vehicle_licenses_vehicleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_licenses
    ADD CONSTRAINT "vehicle_licenses_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES public.vehicles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: vehicle_maintenance_records vehicle_maintenance_records_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_maintenance_records
    ADD CONSTRAINT "vehicle_maintenance_records_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: vehicle_maintenance_records vehicle_maintenance_records_vehicleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_maintenance_records
    ADD CONSTRAINT "vehicle_maintenance_records_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES public.vehicles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: vehicle_reimbursements vehicle_reimbursements_approvedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_reimbursements
    ADD CONSTRAINT "vehicle_reimbursements_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: vehicle_reimbursements vehicle_reimbursements_businessId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_reimbursements
    ADD CONSTRAINT "vehicle_reimbursements_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES public.businesses(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: vehicle_reimbursements vehicle_reimbursements_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_reimbursements
    ADD CONSTRAINT "vehicle_reimbursements_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: vehicle_reimbursements vehicle_reimbursements_vehicleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_reimbursements
    ADD CONSTRAINT "vehicle_reimbursements_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES public.vehicles(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: vehicle_trips vehicle_trips_businessId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_trips
    ADD CONSTRAINT "vehicle_trips_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES public.businesses(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: vehicle_trips vehicle_trips_driverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_trips
    ADD CONSTRAINT "vehicle_trips_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES public.vehicle_drivers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: vehicle_trips vehicle_trips_driverId_vehicleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_trips
    ADD CONSTRAINT "vehicle_trips_driverId_vehicleId_fkey" FOREIGN KEY ("driverId", "vehicleId") REFERENCES public.driver_authorizations("driverId", "vehicleId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: vehicle_trips vehicle_trips_vehicleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicle_trips
    ADD CONSTRAINT "vehicle_trips_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES public.vehicles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: vehicles vehicles_businessId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT "vehicles_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES public.businesses(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: vehicles vehicles_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT "vehicles_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

