package utils

import(
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	Counters = map[string]*prometheus.CounterVec{}
	Gauges = map[string]*prometheus.GaugeVec{}
	Histograms = map[string]prometheus.Histogram{}
	HostName = ""
)

func AddCounter(name string, labels ...string){
	Counters[name] = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: name, Help: name,
	}, labels)
}

func CounterInc(name string, value float64, lblValues ...string){
	Counters[name].WithLabelValues(lblValues...).Add(value)
}

func CounterIncInt(name string, value int, lblValues ...string){
	Counters[name].WithLabelValues(lblValues...).Add(float64(value))
}

func AddGauge(name string, labels ...string){
	Gauges[name] = promauto.NewGaugeVec(prometheus.GaugeOpts{
		Name: name, Help: name,
	}, labels)
}

func GaugeSet(name string, value float64, lblValues ...string){
	Gauges[name].WithLabelValues(lblValues...).Set(value)
}

func GaugeSetInt(name string, value int, lblValues ...string){
	Gauges[name].WithLabelValues(lblValues...).Set(float64(value))
}

func AddHistogram(name string){
	Histograms[name] = promauto.NewHistogram(prometheus.HistogramOpts{
		Name: name, Help: name,
	})
}
