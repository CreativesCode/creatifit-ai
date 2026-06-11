# Aplica un archivo .sql al proyecto Supabase live vía Management API, usando el
# access token del CLI (Windows Credential Manager, target "Supabase CLI:supabase").
# Uso: powershell -File scripts/run-sql.ps1 -SqlFile schemas/add-body-measurements.sql
param(
  [Parameter(Mandatory = $true)][string]$SqlFile,
  [string]$ProjectRef = "oacjsudvmgkrtcesxjsr"
)

$ErrorActionPreference = "Stop"

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class CredMan {
  [DllImport("advapi32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
  public static extern bool CredRead(string target, int type, int flags, out IntPtr credential);
  [DllImport("advapi32.dll")] public static extern void CredFree(IntPtr cred);
  [StructLayout(LayoutKind.Sequential)]
  public struct CREDENTIAL {
    public int Flags; public int Type; public IntPtr TargetName; public IntPtr Comment;
    public long LastWritten; public int CredentialBlobSize; public IntPtr CredentialBlob;
    public int Persist; public int AttributeCount; public IntPtr Attributes;
    public IntPtr TargetAlias; public IntPtr UserName;
  }
}
"@

function Get-SupabaseToken {
  $ptr = [IntPtr]::Zero
  if (-not [CredMan]::CredRead("Supabase CLI:supabase", 1, 0, [ref]$ptr)) {
    throw "No se pudo leer la credencial 'Supabase CLI:supabase' (¿logueado con el CLI?)"
  }
  try {
    $cred = [System.Runtime.InteropServices.Marshal]::PtrToStructure($ptr, [type][CredMan+CREDENTIAL])
    $bytes = New-Object byte[] $cred.CredentialBlobSize
    [System.Runtime.InteropServices.Marshal]::Copy($cred.CredentialBlob, $bytes, 0, $cred.CredentialBlobSize)
    $blob = [System.Text.Encoding]::UTF8.GetString($bytes)
  } finally {
    [CredMan]::CredFree($ptr)
  }
  # El blob puede ser JSON o texto plano: extraemos el token sbp_ de forma robusta.
  $m = [regex]::Match($blob, "sbp_[A-Za-z0-9]+")
  if (-not $m.Success) { throw "No se encontró un token sbp_ en la credencial." }
  return $m.Value
}

$token = Get-SupabaseToken
$sql = [string](Get-Content -Raw -Path $SqlFile)
# ConvertTo-Json en PS 5.1 envuelve strings como objeto {value,Count}; usamos el
# serializador .NET, que produce JSON correcto para un string.
Add-Type -AssemblyName System.Web.Extensions
$ser = New-Object System.Web.Script.Serialization.JavaScriptSerializer
$body = $ser.Serialize(@{ query = $sql })
$uri = "https://api.supabase.com/v1/projects/$ProjectRef/database/query"

Write-Output "-> Aplicando $SqlFile a $ProjectRef ..."
try {
  $resp = Invoke-RestMethod -Method Post -Uri $uri -Headers @{ Authorization = "Bearer $token" } `
    -ContentType "application/json" -Body $body
  Write-Output "[OK] OK"
  if ($null -ne $resp) { $resp | ConvertTo-Json -Depth 6 }
} catch {
  Write-Output "[ERROR] ERROR"
  if ($_.ErrorDetails.Message) { Write-Output $_.ErrorDetails.Message }
  else { Write-Output $_.Exception.Message }
  exit 1
}
