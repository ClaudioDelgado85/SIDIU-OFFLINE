$dir = 'c:\Users\Estudiante\Downloads\proyecto-completo-final\proyecto\public'
$files = @('dashboard.html','expedientes.html','intimaciones.html','infracciones.html','reclamos.html','relevamientos.html','comercios.html','vendedores.html','tareas_diarias.html','informe_diario.html','busqueda.html','catalogos.html')
foreach($file in $files) {
    $path = Join-Path $dir $file
    $content = Get-Content $path -Raw -Encoding UTF8
    if ($content -notmatch 'session-manager\.js') {
        $replacement = '<script src="js/navbar.js"></script>' + "`n" + '    <script src="js/session-manager.js"></script>'
        $content = $content -replace '<script src="js/navbar\.js"></script>', $replacement
        [System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
        Write-Host "Updated: $file"
    } else {
        Write-Host "Already has session-manager: $file"
    }
}
