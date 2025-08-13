export class ImportSessionCreateDto { 
  csv!: string; 
}

export class ImportSessionApproveDto { 
  token!: string; 
}

export class ImportSessionRejectDto { 
  token!: string; 
}