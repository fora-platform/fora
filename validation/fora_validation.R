# FORA validation against lidR
#
# For each dataset the point cloud is normalized against a TIN surface built
# from the ground returns, a CHM is rasterized, and three lidR algorithms
# (Dalponte2016, Silva2016, watershed) are run. Their trees are matched
# one-to-one against FORA's exported tree metrics for the same dataset, and
# height and crown-diameter agreement is reported.
#
# The comparison set is FORA's own output, so the statistics describe
# cross-tool agreement, not accuracy against ground truth.
#
# Matching rule: for each FORA tree, take the nearest lidR tree within 5 m that
# has not already been used. Each lidR tree is therefore matched at most once.
#
# Inputs
#   <id>_treesonly.laz              vegetation returns
#   <id>_ground_classification.laz  ground returns
#   FORA_<id>_metrics.csv           tree metrics exported from FORA
#
# Some datasets are clipped to a square around a given centre: the point cloud
# is clipped to twice the side of the reference square so that crowns at the
# edge of the reference area are still complete.
#
# B. Gencal, Bursa Technical University

library(lidR)
library(ggplot2)
library(dplyr)

Sys.setlocale("LC_ALL", "C")

las_dir  <- "F:/lidar"
fora_dir <- "F:/lidar/fora_exports"
out_dir  <- "F:/lidar/output"

dir.create(out_dir, showWarnings = FALSE, recursive = TRUE)

algo_colors <- c(Dalponte2016 = "#f59e0b",
                 Silva2016    = "#34d399",
                 Watershed    = "#a855f7")

# FORA writes H_auto / CD_auto; older exports used H_m / CD_m
read_fora <- function(path) {
  d <- read.csv(path, stringsAsFactors = FALSE)
  if (!"H_m"  %in% names(d) && "H_auto"  %in% names(d)) d$H_m  <- d$H_auto
  if (!"CD_m" %in% names(d) && "CD_auto" %in% names(d)) d$CD_m <- d$CD_auto
  d$CenterX <- as.numeric(d$CenterX)
  d$CenterY <- as.numeric(d$CenterY)
  d$H_m     <- as.numeric(d$H_m)
  d$CD_m    <- as.numeric(d$CD_m)
  d[!is.na(d$H_m) & !is.na(d$CenterX), ]
}


# ---------------------------------------------------------------------------
# one dataset
# ---------------------------------------------------------------------------

fora_validate <- function(trees_laz,
                          ground_laz,
                          fora_csv,
                          dataset_name,
                          output_dir     = out_dir,
                          clip_center_x  = NULL,
                          clip_center_y  = NULL,
                          clip_half_size = NULL,
                          ws             = 4,
                          hmin           = 2,
                          chm_res        = 0.5,
                          max_height     = 40,
                          min_points     = 5,
                          max_match_dist = 5,
                          algorithms = c("Dalponte2016", "Silva2016", "Watershed")) {

  cat("\n---------------------------------------\n")
  cat("  FORA validation:", dataset_name, "\n")
  cat("---------------------------------------\n\n")

  dir.create(output_dir, showWarnings = FALSE, recursive = TRUE)

  cat(">> reading data\n")

  if (!is.null(clip_center_x)) {
    xmin <- clip_center_x - clip_half_size
    xmax <- clip_center_x + clip_half_size
    ymin <- clip_center_y - clip_half_size
    ymax <- clip_center_y + clip_half_size
    filt <- paste("-keep_xy", xmin, ymin, xmax, ymax)
    las <- readLAS(trees_laz,  filter = filt)
    gnd <- readLAS(ground_laz, filter = filt)
    cat("  clip:", clip_half_size * 2, "x", clip_half_size * 2, "m\n")
  } else {
    las <- readLAS(trees_laz)
    gnd <- readLAS(ground_laz)
  }

  if (is.empty(las)) stop("tree point cloud is empty")
  if (is.empty(gnd)) stop("ground point cloud is empty")
  cat("  trees:", npoints(las), "| ground:", npoints(gnd), "\n")

  cat("\n>> normalization\n")
  dtm      <- rasterize_terrain(gnd, res = 0.5, algorithm = tin())
  las_norm <- normalize_height(las, dtm)
  las_norm <- filter_poi(las_norm, Z >= 0 & Z < max_height)
  cat("  z range: 0 -", round(max(las_norm$Z), 2), "m |",
      npoints(las_norm), "points\n")

  cat("\n>> CHM\n")
  chm   <- rasterize_canopy(las_norm, res = chm_res, algorithm = p2r())
  ttops <- locate_trees(chm, lmf(ws = ws, hmin = hmin))
  cat("  tree tops:", nrow(ttops), "\n")

  extract_metrics <- function(las_seg, algo_name) {
    m <- crown_metrics(las_seg, func = ~list(
      H   = max(Z),
      CD  = (max(X) - min(X) + max(Y) - min(Y)) / 2,
      CPA = pi / 4 * (max(X) - min(X)) * (max(Y) - min(Y)),
      N   = length(Z),
      X_center = mean(X),
      Y_center = mean(Y)), geom = "point")
    df <- as.data.frame(m)
    df <- df[!is.na(df$H) & df$N >= min_points, ]
    df$Algorithm <- algo_name
    df
  }

  match_trees <- function(lr_df, fora_df) {
    matched <- data.frame()
    used    <- integer(0)
    for (i in seq_len(nrow(fora_df))) {
      dists <- sqrt((lr_df$X_center - fora_df$CenterX[i])^2 +
                    (lr_df$Y_center - fora_df$CenterY[i])^2)
      for (j in order(dists)) {
        if (is.na(dists[j])) next
        if (dists[j] > max_match_dist) break
        if (!(j %in% used)) {
          matched <- rbind(matched, data.frame(
            H_fora  = fora_df$H_m[i],  H_lr  = lr_df$H[j],
            CD_fora = fora_df$CD_m[i], CD_lr = lr_df$CD[j],
            Dist = round(dists[j], 3)))
          used <- c(used, j)
          break
        }
      }
    }
    matched
  }

  cat("\n>> segmentation and timing\n")

  algo_results   <- list()
  timing_results <- data.frame()

  for (algo in algorithms) {
    cat("  ", algo, "... ", sep = "")
    tryCatch({
      t_start <- Sys.time()

      las_seg <- switch(algo,
        Dalponte2016 = segment_trees(las_norm, dalponte2016(chm, ttops)),
        Silva2016    = segment_trees(las_norm, silva2016(chm, ttops)),
        Watershed    = segment_trees(las_norm, lidR::watershed(chm, th_tree = hmin)))

      elapsed <- round(as.numeric(difftime(Sys.time(), t_start, units = "secs")), 2)

      df_algo <- extract_metrics(las_seg, algo)
      algo_results[[algo]] <- df_algo

      timing_results <- rbind(timing_results, data.frame(
        Dataset = dataset_name, Algorithm = algo,
        Time_sec = elapsed, N_points = npoints(las_norm)))

      cat(nrow(df_algo), "trees |", elapsed, "s\n")

      write.csv(df_algo,
                file.path(output_dir, paste0("lidR_", algo, "_", dataset_name, ".csv")),
                row.names = FALSE)
    }, error = function(e) cat("error:", e$message, "\n"))
  }

  write.csv(timing_results,
            file.path(output_dir, paste0("timing_", dataset_name, ".csv")),
            row.names = FALSE)

  cat("\n>> algorithm comparison\n")
  algo_comparison <- do.call(rbind, lapply(algo_results, function(df)
    data.frame(Algorithm = df$Algorithm[1], N_trees = nrow(df),
               H_mean  = round(mean(df$H), 2),
               H_max   = round(max(df$H), 2),
               H_sd    = round(sd(df$H), 2),
               CD_mean = round(mean(df$CD), 2),
               CD_sd   = round(sd(df$CD), 2))))
  print(algo_comparison)
  write.csv(algo_comparison,
            file.path(output_dir, paste0("algo_comparison_", dataset_name, ".csv")),
            row.names = FALSE)

  cat("\n>> matching against FORA\n")
  fora <- read_fora(fora_csv)
  cat("  FORA trees:", nrow(fora), "\n")

  fora_comparisons <- list()
  all_matched      <- list()

  for (algo in names(algo_results)) {
    matched <- match_trees(algo_results[[algo]], fora)
    if (nrow(matched) <= 5) next

    matched$Algorithm   <- algo
    all_matched[[algo]] <- matched

    rmse_h  <- round(sqrt(mean((matched$H_fora  - matched$H_lr)^2)), 2)
    bias_h  <- round(mean(matched$H_fora - matched$H_lr), 2)
    r2_h    <- round(cor(matched$H_fora,  matched$H_lr)^2, 3)
    rmse_cd <- round(sqrt(mean((matched$CD_fora - matched$CD_lr)^2)), 2)
    bias_cd <- round(mean(matched$CD_fora - matched$CD_lr), 2)
    r2_cd   <- round(cor(matched$CD_fora, matched$CD_lr)^2, 3)
    tt_h    <- t.test(matched$H_fora,  matched$H_lr,  paired = TRUE)
    tt_cd   <- t.test(matched$CD_fora, matched$CD_lr, paired = TRUE)

    fora_comparisons[[algo]] <- data.frame(
      Algorithm = algo, Matched = nrow(matched),
      H_RMSE = rmse_h, H_Bias = bias_h, H_R2 = r2_h,
      H_p = round(tt_h$p.value, 4),
      CD_RMSE = rmse_cd, CD_Bias = bias_cd, CD_R2 = r2_cd,
      CD_p = round(tt_cd$p.value, 4),
      Mean_Dist = round(mean(matched$Dist), 2))

    cat("  ", algo, ": n =", nrow(matched),
        " H_RMSE =", rmse_h, " H_R2 =", r2_h, "\n")

    write.csv(matched,
              file.path(output_dir, paste0("matched_", algo, "_", dataset_name, ".csv")),
              row.names = FALSE)
  }

  fora_comp_table <- do.call(rbind, fora_comparisons)
  print(fora_comp_table)
  write.csv(fora_comp_table,
            file.path(output_dir, paste0("fora_vs_lidR_", dataset_name, ".csv")),
            row.names = FALSE)

  cat("\n>> figures\n")
  primary_matched <- all_matched[[names(algo_results)[1]]]

  if (!is.null(primary_matched) && nrow(primary_matched) > 5) {

    bind_matched <- function(f)
      do.call(rbind, lapply(names(all_matched), function(a) {
        m <- all_matched[[a]]
        if (is.null(m)) NULL else f(m, a)
      }))

    combined_h <- bind_matched(function(m, a)
      data.frame(H_fora = m$H_fora, H_lr = m$H_lr, Algorithm = a))

    p1 <- ggplot(combined_h, aes(x = H_lr, y = H_fora, color = Algorithm)) +
      geom_point(alpha = 0.3, size = 1) +
      geom_abline(slope = 1, intercept = 0, color = "red",
                  linetype = "dashed", linewidth = 0.8) +
      geom_smooth(method = "lm", se = FALSE, linewidth = 0.7) +
      scale_color_manual(values = algo_colors) +
      labs(x = "lidR tree height (m)", y = "FORA tree height (m)",
           title = paste0(dataset_name, " - height, FORA vs all algorithms")) +
      theme_minimal(base_size = 11) + coord_equal()
    ggsave(file.path(output_dir, paste0("fig_H_", dataset_name, ".png")),
           p1, width = 7, height = 6, dpi = 300)

    combined_ba <- bind_matched(function(m, a)
      data.frame(H_avg = (m$H_fora + m$H_lr) / 2,
                 H_dif = m$H_fora - m$H_lr, Algorithm = a))

    p2 <- ggplot(combined_ba, aes(x = H_avg, y = H_dif, color = Algorithm)) +
      geom_point(alpha = 0.3, size = 1) +
      geom_hline(yintercept = 0, color = "gray50") +
      geom_smooth(method = "loess", se = FALSE, linewidth = 0.7) +
      scale_color_manual(values = algo_colors) +
      labs(x = "mean height (m)", y = "difference: FORA - lidR (m)",
           title = paste0(dataset_name, " - Bland-Altman")) +
      theme_minimal(base_size = 11)
    ggsave(file.path(output_dir, paste0("fig_BA_", dataset_name, ".png")),
           p2, width = 7, height = 5, dpi = 300)

    combined_cd <- bind_matched(function(m, a)
      data.frame(CD_fora = m$CD_fora, CD_lr = m$CD_lr, Algorithm = a))

    p3 <- ggplot(combined_cd, aes(x = CD_lr, y = CD_fora, color = Algorithm)) +
      geom_point(alpha = 0.3, size = 1) +
      geom_abline(slope = 1, intercept = 0, color = "red",
                  linetype = "dashed", linewidth = 0.8) +
      geom_smooth(method = "lm", se = FALSE, linewidth = 0.7) +
      scale_color_manual(values = algo_colors) +
      labs(x = "lidR crown diameter (m)", y = "FORA crown diameter (m)",
           title = paste0(dataset_name, " - crown diameter")) +
      theme_minimal(base_size = 11) + coord_equal()
    ggsave(file.path(output_dir, paste0("fig_CD_", dataset_name, ".png")),
           p3, width = 7, height = 6, dpi = 300)

    all_heights <- data.frame(Height = primary_matched$H_fora, Source = "FORA")
    for (algo in names(algo_results))
      all_heights <- rbind(all_heights,
                           data.frame(Height = algo_results[[algo]]$H, Source = algo))

    src_colors <- c(FORA = "#22d3ee", algo_colors)
    p4 <- ggplot(all_heights, aes(x = Height, fill = Source, color = Source)) +
      geom_density(alpha = 0.2, linewidth = 0.8) +
      scale_fill_manual(values = src_colors) +
      scale_color_manual(values = src_colors) +
      labs(x = "tree height (m)", y = "density",
           title = paste0(dataset_name, " - height distribution")) +
      theme_minimal(base_size = 11)
    ggsave(file.path(output_dir, paste0("fig_Dist_", dataset_name, ".png")),
           p4, width = 8, height = 5, dpi = 300)

    combined_dist <- bind_matched(function(m, a)
      data.frame(Dist = m$Dist, Algorithm = a))

    p5 <- ggplot(combined_dist, aes(x = Dist, fill = Algorithm)) +
      geom_histogram(alpha = 0.5, bins = 25, position = "identity") +
      scale_fill_manual(values = algo_colors) +
      labs(x = "match distance (m)", y = "frequency",
           title = paste0(dataset_name, " - match distance")) +
      theme_minimal(base_size = 11)
    ggsave(file.path(output_dir, paste0("fig_MatchDist_", dataset_name, ".png")),
           p5, width = 7, height = 4, dpi = 300)

    cat("  5 figures saved\n")
  }

  cat("\n>> window-size sensitivity (ws = 2-6)\n")

  sensitivity <- data.frame()
  for (ws_test in c(2, 3, 4, 5, 6)) {
    cat("  ws =", ws_test, "... ")
    tryCatch({
      ttops_t   <- locate_trees(chm, lmf(ws = ws_test, hmin = hmin))
      las_t     <- segment_trees(las_norm, dalponte2016(chm, ttops_t))
      m_t       <- extract_metrics(las_t, paste0("ws", ws_test))
      matched_t <- match_trees(m_t, fora)

      if (nrow(matched_t) > 5) {
        sensitivity <- rbind(sensitivity, data.frame(
          Dataset = dataset_name, ws = ws_test,
          N_detected = nrow(ttops_t), N_segments = nrow(m_t),
          N_matched  = nrow(matched_t),
          H_RMSE  = round(sqrt(mean((matched_t$H_fora - matched_t$H_lr)^2)), 2),
          H_Bias  = round(mean(matched_t$H_fora - matched_t$H_lr), 2),
          H_R2    = round(cor(matched_t$H_fora, matched_t$H_lr)^2, 3),
          CD_RMSE = round(sqrt(mean((matched_t$CD_fora - matched_t$CD_lr)^2)), 2),
          CD_R2   = round(cor(matched_t$CD_fora, matched_t$CD_lr)^2, 3)))
        cat(nrow(ttops_t), "tops,", nrow(m_t), "trees\n")
      } else {
        cat("too few matches\n")
      }
    }, error = function(e) cat("error\n"))
  }

  write.csv(sensitivity,
            file.path(output_dir, paste0("sensitivity_", dataset_name, ".csv")),
            row.names = FALSE)

  cat("\n  ", dataset_name, "done\n")

  list(algo_comparison = algo_comparison,
       fora_comparison = fora_comp_table,
       matched         = primary_matched,
       timing          = timing_results,
       sensitivity     = sensitivity)
}


# ---------------------------------------------------------------------------
# combine per-dataset results
# ---------------------------------------------------------------------------

combine_results <- function(..., output_dir = out_dir) {

  results  <- list(...)
  ds_names <- c("EN23611_2", "EN23612", "EN24111", "EN21217",
                "EN21220_2", "EN21232_1", "EN21234", "EN21239")

  all_algo <- data.frame()
  all_fora <- data.frame()

  for (i in seq_along(results)) {
    r   <- results[[i]]
    dsn <- ds_names[i]

    if (!is.null(r$matched) && nrow(r$matched) > 0) {
      all_algo <- rbind(all_algo, data.frame(
        Dataset = dsn, Algorithm = "FORA",
        N_trees = nrow(r$matched),
        H_mean  = round(mean(r$matched$H_fora), 2),
        H_max   = round(max(r$matched$H_fora), 2),
        H_sd    = round(sd(r$matched$H_fora), 2),
        CD_mean = round(mean(r$matched$CD_fora), 2),
        CD_sd   = round(sd(r$matched$CD_fora), 2)))
    }
    if (!is.null(r$algo_comparison)) {
      tmp <- r$algo_comparison
      tmp$Dataset <- dsn
      all_algo <- rbind(all_algo, tmp[, c("Dataset", names(r$algo_comparison))])
    }
    if (!is.null(r$fora_comparison)) {
      tmp <- r$fora_comparison
      tmp$Dataset <- dsn
      all_fora <- rbind(all_fora, tmp[, c("Dataset", names(r$fora_comparison))])
    }
  }

  summary_by_algo <- all_fora %>%
    group_by(Algorithm) %>%
    summarise(N_datasets      = n(),
              Total_matched   = sum(Matched),
              H_RMSE_mean     = round(mean(H_RMSE), 2),
              H_Bias_mean     = round(mean(H_Bias), 2),
              H_R2_mean       = round(mean(H_R2), 3),
              CD_RMSE_mean    = round(mean(CD_RMSE), 2),
              CD_Bias_mean    = round(mean(CD_Bias), 2),
              CD_R2_mean      = round(mean(CD_R2), 3),
              Match_Dist_mean = round(mean(Mean_Dist), 2))

  cat("\n=== summary ===\n")
  print(as.data.frame(summary_by_algo))

  write.csv(all_algo, file.path(output_dir, "ALL_algo_with_fora.csv"), row.names = FALSE)
  write.csv(all_fora, file.path(output_dir, "ALL_fora_comparison.csv"), row.names = FALSE)
  write.csv(as.data.frame(summary_by_algo),
            file.path(output_dir, "ALL_summary.csv"), row.names = FALSE)

  list(algo = all_algo, fora = all_fora, summary = summary_by_algo)
}


# ---------------------------------------------------------------------------
# pooled figures across all datasets
# ---------------------------------------------------------------------------

combine_all_plots <- function(..., output_dir = out_dir) {

  results  <- list(...)
  ds_names <- c("EN23611_2", "EN23612", "EN24111", "EN21217",
                "EN21220_2", "EN21232_1", "EN21234", "EN21239")

  all_m <- data.frame()
  for (i in seq_along(results)) {
    r <- results[[i]]
    if (!is.null(r$matched) && nrow(r$matched) > 0) {
      tmp <- r$matched
      tmp$Dataset <- ds_names[i]
      all_m <- rbind(all_m, tmp)
    }
  }

  rmse_all <- round(sqrt(mean((all_m$H_fora - all_m$H_lr)^2)), 2)
  bias_all <- round(mean(all_m$H_fora - all_m$H_lr), 2)
  r2_all   <- round(cor(all_m$H_fora, all_m$H_lr)^2, 3)
  rmse_cd  <- round(sqrt(mean((all_m$CD_fora - all_m$CD_lr)^2)), 2)
  bias_cd  <- round(mean(all_m$CD_fora - all_m$CD_lr), 2)
  r2_cd    <- round(cor(all_m$CD_fora, all_m$CD_lr)^2, 3)

  cat("total trees:", nrow(all_m), "\n")
  cat("H  RMSE:", rmse_all, "| R2:", r2_all, "| bias:", bias_all, "\n")
  cat("CD RMSE:", rmse_cd,  "| R2:", r2_cd,  "| bias:", bias_cd,  "\n")

  p1 <- ggplot(all_m, aes(x = H_lr, y = H_fora, color = Dataset)) +
    geom_point(alpha = 0.3, size = 0.8) +
    geom_abline(slope = 1, intercept = 0, color = "red", linetype = "dashed") +
    geom_smooth(method = "lm", se = FALSE, linewidth = 0.5) +
    scale_color_brewer(palette = "Set2") +
    annotate("text", x = 2, y = max(all_m$H_fora) - 1,
             label = paste0("n = ", nrow(all_m),
                            "\nRMSE = ", rmse_all,
                            " m\nBias = ", bias_all,
                            " m\nR2 = ", r2_all),
             hjust = 0, size = 3.5, fontface = "bold") +
    labs(x = "lidR (Dalponte2016) tree height (m)",
         y = "FORA tree height (m)",
         title = "Pooled tree height, eight datasets") +
    theme_minimal(base_size = 11) + coord_equal()
  ggsave(file.path(output_dir, "fig_COMBINED_H.png"), p1,
         width = 8, height = 7, dpi = 300)

  all_m$H_avg <- (all_m$H_fora + all_m$H_lr) / 2
  all_m$H_dif <- all_m$H_fora - all_m$H_lr
  loa_up <- mean(all_m$H_dif) + 1.96 * sd(all_m$H_dif)
  loa_lo <- mean(all_m$H_dif) - 1.96 * sd(all_m$H_dif)

  p2 <- ggplot(all_m, aes(x = H_avg, y = H_dif, color = Dataset)) +
    geom_point(alpha = 0.3, size = 0.8) +
    geom_hline(yintercept = mean(all_m$H_dif), color = "blue", linewidth = 0.8) +
    geom_hline(yintercept = c(loa_up, loa_lo), color = "red", linetype = "dashed") +
    scale_color_brewer(palette = "Set2") +
    annotate("text", x = max(all_m$H_avg) - 3, y = loa_up + 0.5,
             label = paste0("+1.96 SD = ", round(loa_up, 2)),
             color = "red", size = 3) +
    annotate("text", x = max(all_m$H_avg) - 3, y = loa_lo - 0.5,
             label = paste0("-1.96 SD = ", round(loa_lo, 2)),
             color = "red", size = 3) +
    labs(x = "mean height (m)", y = "difference: FORA - lidR (m)",
         title = "Pooled Bland-Altman, eight datasets") +
    theme_minimal(base_size = 11)
  ggsave(file.path(output_dir, "fig_COMBINED_BA.png"), p2,
         width = 8, height = 5, dpi = 300)

  p3 <- ggplot(all_m, aes(x = CD_lr, y = CD_fora, color = Dataset)) +
    geom_point(alpha = 0.3, size = 0.8) +
    geom_abline(slope = 1, intercept = 0, color = "red", linetype = "dashed") +
    geom_smooth(method = "lm", se = FALSE, linewidth = 0.5) +
    scale_color_brewer(palette = "Set2") +
    annotate("text", x = 1, y = max(all_m$CD_fora) - 1,
             label = paste0("n = ", nrow(all_m),
                            "\nRMSE = ", rmse_cd,
                            " m\nR2 = ", r2_cd),
             hjust = 0, size = 3.5) +
    labs(x = "lidR crown diameter (m)", y = "FORA crown diameter (m)",
         title = "Pooled crown diameter, eight datasets") +
    theme_minimal(base_size = 11) + coord_equal()
  ggsave(file.path(output_dir, "fig_COMBINED_CD.png"), p3,
         width = 8, height = 7, dpi = 300)

  per_ds <- all_m %>%
    group_by(Dataset) %>%
    summarise(n = n(),
              H_RMSE  = round(sqrt(mean((H_fora - H_lr)^2)), 2),
              H_R2    = round(cor(H_fora, H_lr)^2, 3),
              CD_RMSE = round(sqrt(mean((CD_fora - CD_lr)^2)), 2),
              .groups = "drop")

  p4 <- ggplot(per_ds, aes(x = reorder(Dataset, H_RMSE), y = H_RMSE)) +
    geom_col(fill = "#22d3ee", alpha = 0.7) +
    geom_text(aes(label = paste0("R2 = ", H_R2)), vjust = -0.5, size = 3) +
    geom_hline(yintercept = rmse_all, color = "red", linetype = "dashed") +
    labs(x = "dataset", y = "height RMSE (m)",
         title = "Per-dataset height RMSE") +
    theme_minimal(base_size = 11) +
    theme(axis.text.x = element_text(angle = 35, hjust = 1))
  ggsave(file.path(output_dir, "fig_RMSE_BarChart.png"), p4,
         width = 8, height = 5, dpi = 300)

  timing_files <- list.files(output_dir, "^timing_", full.names = TRUE)
  if (length(timing_files) > 0) {
    all_t <- do.call(rbind, lapply(timing_files, read.csv))
    write.csv(all_t, file.path(output_dir, "ALL_timing.csv"), row.names = FALSE)

    p5 <- ggplot(all_t, aes(x = Dataset, y = Time_sec, fill = Algorithm)) +
      geom_col(position = "dodge", alpha = 0.8) +
      scale_fill_manual(values = algo_colors) +
      labs(x = "", y = "time (s)", title = "lidR processing time by algorithm") +
      theme_minimal(base_size = 11) +
      theme(axis.text.x = element_text(angle = 35, hjust = 1))
    ggsave(file.path(output_dir, "fig_Timing.png"), p5,
           width = 8, height = 5, dpi = 300)

    cat("\n=== timing ===\n")
    print(all_t)
  }

  sens_files <- list.files(output_dir, "^sensitivity_", full.names = TRUE)
  if (length(sens_files) > 0) {
    all_s <- do.call(rbind, lapply(sens_files, read.csv))
    write.csv(all_s, file.path(output_dir, "ALL_sensitivity.csv"), row.names = FALSE)

    s_avg <- all_s %>%
      group_by(ws) %>%
      summarise(N_det  = round(mean(N_detected)),
                H_RMSE = round(mean(H_RMSE, na.rm = TRUE), 2),
                H_R2   = round(mean(H_R2,   na.rm = TRUE), 3),
                CD_R2  = round(mean(CD_R2,  na.rm = TRUE), 3),
                .groups = "drop")

    write.csv(s_avg, file.path(output_dir, "ALL_sensitivity_avg.csv"),
              row.names = FALSE)

    p6 <- ggplot(s_avg, aes(x = factor(ws))) +
      geom_col(aes(y = N_det), fill = "#22d3ee", alpha = 0.5, width = 0.6) +
      geom_line(aes(y = H_R2 * max(N_det), group = 1),
                color = "#f59e0b", linewidth = 1.5) +
      geom_point(aes(y = H_R2 * max(N_det)), color = "#f59e0b", size = 4) +
      geom_text(aes(y = N_det, label = N_det), vjust = -0.5, size = 3.5) +
      geom_text(aes(y = H_R2 * max(N_det), label = paste0("R2 = ", H_R2)),
                vjust = 2, size = 3, color = "#f59e0b") +
      scale_y_continuous(name = "mean detected trees",
                         sec.axis = sec_axis(~ . / max(s_avg$N_det),
                                             name = "mean height R2")) +
      labs(x = "window size (m)",
           title = "Window-size sensitivity, eight-dataset average") +
      theme_minimal(base_size = 12)
    ggsave(file.path(output_dir, "fig_Sensitivity_ALL.png"), p6,
           width = 7, height = 5, dpi = 300)

    cat("\n=== sensitivity ===\n")
    print(as.data.frame(s_avg))
  }

  cat("\ncombined figures done\n")
  cat("H RMSE:", rmse_all, "| R2:", r2_all, "| n:", nrow(all_m), "\n")
}


# ---------------------------------------------------------------------------
# five window settings on EN23611_2
#
# lidR is run under a fixed window and four crown-width functions, each
# compared with FORA's own tree set for this dataset. The rates therefore
# describe agreement with FORA, not accuracy against ground truth.
# ---------------------------------------------------------------------------

window_settings_analysis <- function(trees_laz, ground_laz, fora_csv,
                                     output_dir     = out_dir,
                                     hmin           = 2,
                                     chm_res        = 0.5,
                                     max_height     = 40,
                                     min_points     = 5,
                                     max_match_dist = 5) {

  settings <- list(
    Fixed_ws4     = 4,
    VWS_pine      = function(x) pmax(2, 3.75105 - 0.17919 * x + 0.01241 * x^2),
    VWS_deciduous = function(x) pmax(2, 3.09632 + 0.00895 * x^2),
    VWS_combined  = function(x) pmax(2, 2.51503 + 0.00901 * x^2),
    VWS_linear    = function(x) pmax(2, pmin(5, 0.05 * x + 2.5)))

  win_metrics <- function(las_seg) {
    m <- as.data.frame(crown_metrics(las_seg, func = ~list(
      H = max(Z), CD = (max(X) - min(X) + max(Y) - min(Y)) / 2,
      N = length(Z), X_center = mean(X), Y_center = mean(Y)), geom = "point"))
    m[!is.na(m$H) & m$N >= min_points, ]
  }

  win_match <- function(lr, fora) {
    out <- data.frame(); used <- integer(0)
    for (i in seq_len(nrow(fora))) {
      d <- sqrt((lr$X_center - fora$CenterX[i])^2 +
                (lr$Y_center - fora$CenterY[i])^2)
      for (j in order(d)) {
        if (is.na(d[j]) || d[j] > max_match_dist) break
        if (!(j %in% used)) {
          out <- rbind(out, data.frame(H_fora = fora$H_m[i],  H_lr  = lr$H[j],
                                       CD_fora = fora$CD_m[i], CD_lr = lr$CD[j]))
          used <- c(used, j); break
        }
      }
    }
    out
  }

  las  <- readLAS(trees_laz)
  gnd  <- readLAS(ground_laz)
  dtm  <- rasterize_terrain(gnd, res = 0.5, algorithm = tin())
  lasn <- filter_poi(normalize_height(las, dtm), Z >= 0 & Z < max_height)
  chm  <- rasterize_canopy(lasn, res = chm_res, algorithm = p2r())
  rm(las, gnd, dtm); gc()

  fora  <- read_fora(fora_csv)
  n_ref <- nrow(fora)
  cat("FORA reference trees:", n_ref, "\n")

  tab <- data.frame()
  for (nm in names(settings)) {
    cat(nm, "... ")
    tops <- locate_trees(chm, lmf(ws = settings[[nm]], hmin = hmin))
    seg  <- segment_trees(lasn, dalponte2016(chm, tops))
    det  <- win_metrics(seg)
    m    <- win_match(det, fora)
    rm(seg); gc()

    TP <- nrow(m); FP <- nrow(det) - TP; FN <- n_ref - TP
    prec <- TP / (TP + FP); rec <- TP / (TP + FN)

    tab <- rbind(tab, data.frame(
      Mode = nm, Segmented = nrow(det), Matched = TP,
      H_RMSE  = round(sqrt(mean((m$H_fora - m$H_lr)^2)), 2),
      H_R2    = round(cor(m$H_fora, m$H_lr)^2, 3),
      H_Bias  = round(mean(m$H_fora - m$H_lr), 2),
      CD_RMSE = round(sqrt(mean((m$CD_fora - m$CD_lr)^2)), 2),
      CD_R2   = round(cor(m$CD_fora, m$CD_lr)^2, 3),
      TP = TP, FP = FP, FN = FN,
      Precision  = round(prec, 3),
      Recall     = round(rec, 3),
      F1         = round(2 * prec * rec / (prec + rec), 3),
      Commission = round(FP / nrow(det), 3),
      Omission   = round(FN / n_ref, 3)))
    cat(nrow(det), "segments\n")
  }

  print(tab, row.names = FALSE)
  write.csv(tab, file.path(output_dir, "EN23611_2_window_settings.csv"),
            row.names = FALSE)
  tab
}


# ---------------------------------------------------------------------------
# run
# ---------------------------------------------------------------------------

run <- function(id, trees, ground, cx = NULL, cy = NULL, half = NULL,
                ws = 4, max_height = 30) {
  fora_validate(
    trees_laz      = file.path(las_dir, trees),
    ground_laz     = file.path(las_dir, ground),
    fora_csv       = file.path(fora_dir, paste0("FORA_", id, "_metrics.csv")),
    dataset_name   = id,
    output_dir     = out_dir,
    clip_center_x  = cx,
    clip_center_y  = cy,
    clip_half_size = half,
    ws = ws, hmin = 2, max_height = max_height)
}

r1 <- run("EN23611_2", "trees.laz", "ground.laz",
          ws = 4, max_height = 40)
r2 <- run("EN23612",   "EN23612_treesonly.laz",   "EN23612_ground_classification.laz",
          460499.9, 7199123.0, 40, ws = 4)
r3 <- run("EN24111",   "EN24111_treesonly.laz",   "EN24111_ground_classification.laz",
          562030.8, 7199232.0, 60, ws = 4)
r4 <- run("EN21217",   "EN21217_treesonly.laz",   "EN21217_ground_classification.laz",
          479936.0, 7034703.8, 75, ws = 3)
r5 <- run("EN21220_2", "EN21220_2_treesonly.laz", "EN21220_2_ground_classification.laz",
          361474.9, 6886192.7, 80, ws = 3)
r6 <- run("EN21232_1", "EN21232_1_treesonly.laz", "EN21232_1_ground_classification.laz",
          599500.4, 6894809.2, 80, ws = 4)
r7 <- run("EN21234",   "EN21234_treesonly.laz",   "EN21234_ground_classification.laz",
          571467.5, 6906928.8, 80, ws = 4)
r8 <- run("EN21239",   "EN21239_treesonly.laz",   "EN21239_ground_classification.laz",
          557934.9, 6909902.9, 80, ws = 4)

final <- combine_results(r1, r2, r3, r4, r5, r6, r7, r8)
combine_all_plots(r1, r2, r3, r4, r5, r6, r7, r8)

windows_tab <- window_settings_analysis(
  trees_laz  = file.path(las_dir, "trees.laz"),
  ground_laz = file.path(las_dir, "ground.laz"),
  fora_csv   = file.path(fora_dir, "FORA_EN23611_2_metrics.csv"))
