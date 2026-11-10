param(
 [Parameter(Mandatory=$true)][string]$Manifest,
 [Parameter(Mandatory=$true)][string]$Output,
 [string]$PreviewDirectory
)
$ErrorActionPreference='Stop'
$manifestPath=(Resolve-Path -LiteralPath $Manifest).Path
$base=Split-Path -Parent $manifestPath
$config=Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
if(-not $config.scenes -or $config.scenes.Count -eq 0){throw 'Manifest requires scenes'}
$outputPath=[System.IO.Path]::GetFullPath($Output)
if(Test-Path -LiteralPath $outputPath){throw 'Refusing to overwrite an existing presentation'}
$resolved=@()
foreach($scene in $config.scenes){
 $videoPath=(Resolve-Path -LiteralPath (Join-Path $base $scene.video)).Path
 $posterPath=(Resolve-Path -LiteralPath (Join-Path $base $scene.poster)).Path
 $resolved+=@{title=$scene.title;video=$videoPath;poster=$posterPath}
}
$app=$null
$deck=$null
try {
 $app=New-Object -ComObject PowerPoint.Application
 $deck=$app.Presentations.Add(0)
 $deck.PageSetup.SlideWidth=960
 $deck.PageSetup.SlideHeight=540
 foreach($scene in $resolved){
  $slide=$deck.Slides.Add($deck.Slides.Count+1,12)
  $video=$slide.Shapes.AddMediaObject2($scene.video,0,-1,0,0,960,540)
  $video.MediaFormat.SetDisplayPictureFromFile($scene.poster)
  $video.AnimationSettings.PlaySettings.PlayOnEntry=-1
  $slide.TimeLine.MainSequence.Item(1).Timing.TriggerType=2
  $video.AnimationSettings.PlaySettings.LoopUntilStopped=0
  $video.AnimationSettings.PlaySettings.HideWhileNotPlaying=0
  $slide.SlideShowTransition.AdvanceOnTime=0
  $slide.SlideShowTransition.AdvanceOnClick=-1
  $slide.Name=$scene.title
 }
 $deck.SlideShowSettings.ShowMediaControls=-1
 $deck.SaveAs($outputPath,24)
 if($PreviewDirectory){$deck.Export([System.IO.Path]::GetFullPath($PreviewDirectory),'PNG',960,540)}
 Write-Output $outputPath
} finally {
 if($null -ne $deck){try{$deck.Close()}catch{}}
 if($null -ne $app){try{$app.Quit()}catch{}}
}
