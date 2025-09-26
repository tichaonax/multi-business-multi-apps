import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export const generateContractPDF = async (
  elementRef: HTMLElement, 
  fileName: string
): Promise<void> => {
  try {
    // Configure html2canvas options for better PDF quality
    const canvas = await html2canvas(elementRef, {
      scale: 2, // Higher scale for better quality
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: elementRef.scrollWidth,
      height: elementRef.scrollHeight
    })

    const imgData = canvas.toDataURL('image/png')
    
    // Create PDF with A4 dimensions
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    // Calculate dimensions to fit A4 page
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    const imgWidth = pdfWidth
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    let heightLeft = imgHeight
    let position = 0

    // Add first page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pdfHeight

    // Add additional pages if content is longer than one page
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pdfHeight
    }

    // Save the PDF
    pdf.save(fileName)
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw new Error('Failed to generate PDF')
  }
}

export const previewContractPDF = async (elementRef: HTMLElement): Promise<string> => {
  try {
    const canvas = await html2canvas(elementRef, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: elementRef.scrollWidth,
      height: elementRef.scrollHeight
    })

    const imgData = canvas.toDataURL('image/png')
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    const imgWidth = pdfWidth
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    let heightLeft = imgHeight
    let position = 0

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pdfHeight

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pdfHeight
    }

    // Return PDF as blob URL for preview
    const pdfBlob = pdf.output('blob')
    return URL.createObjectURL(pdfBlob)
  } catch (error) {
    console.error('Error previewing PDF:', error)
    throw new Error('Failed to preview PDF')
  }
}

export const generateContractFileName = (
  employeeName: string,
  contractNumber: string,
  version: number
): string => {
  const sanitizedName = employeeName.replace(/[^a-zA-Z0-9]/g, '_')
  const timestamp = new Date().toISOString().split('T')[0]
  return `Contract_${contractNumber}_v${version}_${sanitizedName}_${timestamp}.pdf`
}