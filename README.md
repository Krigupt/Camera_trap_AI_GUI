# Excel Upload Application

A Next.js application for uploading Excel files (.xlsx) and managing data with image tagging functionality.

## Features

- **File Upload**: Upload .xlsx files with automatic processing
- **Sheet Navigation**: Dropdown to switch between different Excel sheets
- **Data Table**: View Human and AI columns with checkbox selection
- **Image Sidebar**: Tag images with predefined categories
- **MongoDB Integration**: Store and retrieve Excel data
- **Modern UI**: Responsive design with Tailwind CSS

## Prerequisites

- Node.js 18+ 
- MongoDB (local or cloud instance)
- npm or yarn

## Installation

1. Clone the repository and navigate to the project directory:
```bash
cd excel-upload-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Create .env.local file with your MongoDB connection string
MONGODB_URI=mongodb://localhost:27017/excel-upload-app
NEXTAUTH_SECRET=your-secret-key-here
```

4. Start MongoDB (if running locally):
```bash
# On macOS with Homebrew
brew services start mongodb-community

# Or start manually
mongod
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Upload Excel File**: 
   - Navigate to the upload page
   - Select a .xlsx file with Human and AI columns
   - Click "Upload File"

2. **View Data**:
   - After upload, you'll be redirected to the dashboard
   - Use the dropdown in the navbar to switch between sheets
   - View the data table with Human and AI columns

3. **Select and Tag**:
   - Check the boxes next to rows you want to tag
   - The image sidebar will appear on the right
   - Select appropriate tags for each image:
     - Blurry
     - Low-light
     - Body part
     - Blends in
     - Unidentifiable to taxonomix level by human ground-truth

## File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── upload/route.ts          # File upload endpoint
│   │   ├── data/[id]/route.ts       # Data CRUD operations
│   │   └── sheets/[filename]/route.ts # Sheet listing
│   ├── dashboard/[id]/page.tsx      # Main dashboard
│   ├── upload/page.tsx              # Upload page
│   └── page.tsx                     # Home page (redirects to upload)
├── lib/
│   └── mongodb.ts                   # Database connection
├── models/
│   └── ExcelData.ts                 # MongoDB schema
└── types/
    └── global.d.ts                  # TypeScript declarations
```

## API Endpoints

- `POST /api/upload` - Upload Excel file
- `GET /api/data/[id]` - Get data by ID
- `PUT /api/data/[id]` - Update data
- `GET /api/sheets/[filename]` - Get all sheets for a file

## Technologies Used

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **XLSX** - Excel file processing
- **Headless UI** - Accessible UI components
- **Lucide React** - Icons

## Excel File Requirements

Your Excel file should contain:
- At least one sheet with "Human" and "AI" columns (case-insensitive)
- Data in the rows below the headers
- .xlsx format

## Development

To run in development mode:
```bash
npm run dev
```

To build for production:
```bash
npm run build
npm start
```

## Troubleshooting

1. **MongoDB Connection Issues**: Ensure MongoDB is running and the connection string in `.env.local` is correct.

2. **File Upload Errors**: Check that your Excel file has "Human" and "AI" columns and is in .xlsx format.

3. **Build Errors**: Make sure all dependencies are installed with `npm install`.

## License

This project is open source and available under the [MIT License](LICENSE).