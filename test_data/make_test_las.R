# Generate small LAS test files covering legacy and LAS 1.4 point formats.
#
# Purpose: check that the classification field is read from the correct byte in
# every supported format - byte 15 in the legacy formats 0-5, byte 16 in the
# LAS 1.4 formats 6-10, where a flags byte was inserted before it.
#
# The files are written byte by byte rather than through a LAS library, because
# the R writers available here emit a 227-byte (1.2) header even when asked for
# version 1.4, which needs 375 bytes. Writing the records directly also keeps
# the byte layout explicit, which is the thing under test.

out_dir <- "test_data"
dir.create(out_dir, showWarnings = FALSE)

set.seed(1)

# --- synthetic stand: ground plus three tree-like clusters ---
n_gnd <- 200
x <- runif(n_gnd, 0, 40); y <- runif(n_gnd, 0, 40); z <- 100 + rnorm(n_gnd, 0, 0.2)
cls <- rep(2L, n_gnd)                                   # 2 = ground

tx <- c(10, 25, 33); ty <- c(12, 28, 8); th <- c(12, 18, 9)
for (k in seq_along(tx)) {
  m <- 120
  x <- c(x, rnorm(m, tx[k], 1.5))
  y <- c(y, rnorm(m, ty[k], 1.5))
  z <- c(z, 100 + th[k] + rnorm(m, 0, 0.8))
  cls <- c(cls, rep(5L, m))                             # 5 = high vegetation
}
N <- length(x)

scale_xyz <- 0.01
xi <- as.integer(round(x / scale_xyz))
yi <- as.integer(round(y / scale_xyz))
zi <- as.integer(round(z / scale_xyz))

intens <- as.integer(runif(N, 0, 255))
gps    <- runif(N, 0, 1e5)

# Give the points meaningful colours: brown ground, green canopy. LAS stores
# colour as 16-bit, and readers take the high byte, so an 8-bit value is scaled
# by 257. Reading RGB from the wrong offset produces noise instead of this
# pattern, which makes the colour view a check on the per-format RGB offset
# (byte 20 in format 2, byte 28 in format 3, byte 30 in formats 7-8).
is_gnd <- cls == 2L
r8 <- ifelse(is_gnd, 140L, 60L)  + as.integer(runif(N, -12, 12))
g8 <- ifelse(is_gnd, 100L, 140L) + as.integer(runif(N, -12, 12))
b8 <- ifelse(is_gnd,  60L,  55L) + as.integer(runif(N, -12, 12))
clamp8 <- function(v) pmin(255L, pmax(0L, as.integer(v)))
rgb_r <- clamp8(r8) * 257L
rgb_g <- clamp8(g8) * 257L
rgb_b <- clamp8(b8) * 257L
nir   <- clamp8(ifelse(is_gnd, 90L, 200L)) * 257L

# --- little-endian writers ---
u8  <- function(con, v) writeBin(as.raw(bitwAnd(v, 255L)), con)
u16 <- function(con, v) writeBin(as.raw(c(bitwAnd(v, 255L),
                                          bitwAnd(bitwShiftR(v, 8), 255L))), con)
u32 <- function(con, v) writeBin(as.raw(c(bitwAnd(v, 255L),
                                          bitwAnd(bitwShiftR(v, 8),  255L),
                                          bitwAnd(bitwShiftR(v, 16), 255L),
                                          bitwAnd(bitwShiftR(v, 24), 255L))), con)
u64 <- function(con, v) { u32(con, v); u32(con, 0L) }        # values stay < 2^32
i32 <- function(con, v) writeBin(as.integer(v), con, size = 4, endian = "little")
f64 <- function(con, v) writeBin(as.double(v),  con, size = 8, endian = "little")
chr <- function(con, s, n) {
  r <- as.raw(rep(0, n))
  b <- charToRaw(substr(s, 1, n))
  if (length(b)) r[seq_along(b)] <- b
  writeBin(r, con)
}

rec_len <- c("0" = 20, "1" = 28, "2" = 26, "3" = 34,
             "6" = 30, "7" = 36, "8" = 38)

write_header <- function(con, fmt, npts) {
  las14 <- fmt >= 6
  hsize <- if (las14) 375L else 227L
  rl    <- as.integer(rec_len[as.character(fmt)])

  chr(con, "LASF", 4)
  u16(con, 0L)                                  # file source id
  u16(con, if (las14) 1L else 0L)               # global encoding (GPS time type)
  writeBin(as.raw(rep(0, 16)), con)             # project GUID
  u8(con, 1L)                                   # version major
  u8(con, if (las14) 4L else 2L)                # version minor
  chr(con, "", 32)                              # system identifier
  chr(con, "FORA test generator", 32)
  u16(con, 1L); u16(con, 2026L)                 # creation day / year
  u16(con, hsize)
  u32(con, hsize)                               # offset to point data
  u32(con, 0L)                                  # number of VLRs
  u8(con, fmt)
  u16(con, rl)
  # legacy point counts: must be zero for point formats above 5
  u32(con, if (las14) 0L else npts)
  for (i in 1:5) u32(con, if (las14) 0L else if (i == 1) npts else 0L)
  f64(con, scale_xyz); f64(con, scale_xyz); f64(con, scale_xyz)
  f64(con, 0); f64(con, 0); f64(con, 0)         # offsets
  f64(con, max(x)); f64(con, min(x))
  f64(con, max(y)); f64(con, min(y))
  f64(con, max(z)); f64(con, min(z))

  if (las14) {
    u64(con, 0L)                                # start of waveform data
    u64(con, 0L)                                # start of first EVLR
    u32(con, 0L)                                # number of EVLRs
    u64(con, npts)                              # extended point count
    for (i in 1:15) u64(con, if (i == 1) npts else 0L)
  }
}

write_points <- function(con, fmt) {
  for (i in seq_len(N)) {
    i32(con, xi[i]); i32(con, yi[i]); i32(con, zi[i])
    u16(con, intens[i])
    if (fmt >= 6) {
      u8(con, 17L)          # return number 1 of 1 (4-bit fields)
      u8(con, 0L)           # classification flags / scanner channel
      u8(con, cls[i])       # classification  <- byte 16
      u8(con, 0L)           # user data
      writeBin(as.integer(0), con, size = 2, endian = "little")   # scan angle
      u16(con, 0L)          # point source id
      f64(con, gps[i])
      if (fmt >= 7) { u16(con, rgb_r[i]); u16(con, rgb_g[i]); u16(con, rgb_b[i]) }
      if (fmt == 8) u16(con, nir[i])
    } else {
      u8(con, 9L)           # return number 1 of 1 (3-bit fields)
      u8(con, cls[i])       # classification  <- byte 15
      u8(con, 0L)           # scan angle rank
      u8(con, 0L)           # user data
      u16(con, 0L)          # point source id
      if (fmt %in% c(1, 3)) f64(con, gps[i])
      if (fmt %in% c(2, 3)) { u16(con, rgb_r[i]); u16(con, rgb_g[i]); u16(con, rgb_b[i]) }
    }
  }
}

write_file <- function(fmt) {
  path <- file.path(out_dir, sprintf("test_fmt%d.las", fmt))
  con <- file(path, "wb")
  write_header(con, fmt, N)
  write_points(con, fmt)
  close(con)
  cat(sprintf("wrote %s  (format %d, %d points)\n", path, fmt, N))
}

for (f in c(0, 1, 2, 3, 6, 7, 8)) write_file(f)

# --- read the headers back and check what was written ---
cat("\nheader check\n")
for (f in c(0, 1, 2, 3, 6, 7, 8)) {
  path <- file.path(out_dir, sprintf("test_fmt%d.las", f))
  con <- file(path, "rb")
  h <- readBin(con, "raw", 400)
  close(con)
  gi <- function(i, n) sum(as.integer(h[(i + 1):(i + n)]) * 256^(0:(n - 1)))
  cat(sprintf("test_fmt%d.las  version 1.%d  format %d  reclen %d  points %d\n",
              f, as.integer(h[26]), as.integer(h[105]), gi(105, 2),
              if (as.integer(h[26]) >= 4) gi(247, 4) else gi(107, 4)))
}

cat("\nLoad each file in FORA and confirm ground (class 2) and vegetation\n")
cat("(class 5) are reported consistently across all formats.\n")
